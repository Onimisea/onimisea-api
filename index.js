require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cloudinary = require("cloudinary").v2;

const app = express();

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);
app.use(express.json());
app.use(cookieParser());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
});

const multer = require("multer");

const authenticateMiddleware = (req, res, next) => {
  // Check if the request is authenticated

  if (req.cookies.adminToken) {
    // User is authenticated, proceed to the next middleware or route handler
    return next();
  } else {
    // User is not authenticated, send an unauthorized response
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const authorizeMiddleware = (req, res, next) => {
  const token = req.cookies.adminToken;
  const secret = "your_secret_key_here";

  jwt.verify(token, jwt_secret, (err, decoded) => {
    if (err) {
      // Handle token verification error
      console.error("Failed to verify token:", err);
    } else {
      // Access the decoded JWT payload

      if (decoded.admin.role === "superAdmin") {
        // User is authenticated, proceed to the next middleware or route handler
        return next();
      } else {
        // User is not authenticated, send an unauthorized response
        return res
          .status(401)
          .json({ error: "Unauthorized! You are not a Super Admin" });
      }
    }
  });
};

// Set up multer middleware to handle multipart/form-data
const portfolioFeaturedImageStorage = multer.diskStorage({
  destination: function (req, featured_image, callback) {
    callback(null, __dirname + "/uploads/portfolio/featuredImages");
  },

  // filename: function (req, featured_image, callback) {
  //   const filename = `featuredImage_${crypto.randomUUID()}`;
  //   callback(null, filename);
  // },
});

const portfolioFeaturedImageFileFilter = (req, featured_image, callback) => {
  if (
    featured_image.mimetype == "image/png" ||
    featured_image.mimetype == "image/jpg" ||
    featured_image.mimetype == "image/jpeg"
  ) {
    callback(null, true);
  } else {
    callback(null, false);
    return callback(
      new Error("Only .png, .jpg and .jpeg image format allowed!")
    );
  }
};

const portfolioFeaturedImageUpload = multer({
  storage: portfolioFeaturedImageStorage,
  fileFilter: portfolioFeaturedImageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("featured_image");

const featuredImageErrorMiddleware = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.log(err.message);
    res.json({ error: err });
  } else if (err) {
    console.log(err.message);
    res.json({ error: err });
  } else {
    next();
  }
};

const port = process.env.PORT || 2096;
const jwt_secret = process.env.JWT_SECRET;
const saltNumber = 10;

const uploadImage = async (imageFilePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(imageFilePath, {
      folder: folder,
    });

    // Access the uploaded image details from the `result` object
    // console.log("Uploaded image:", result.secure_url);
    return result.secure_url;
    // console.log("Public ID:", result.public_id);
  } catch (error) {
    console.error("Error uploading image:", error);
  }
};

// Admin Register
app.post("/api/v1/admin/register", async (req, res) => {
  try {
    const allAdmins = await pool.query("SELECT * FROM admins");
    const { username, email, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password.toString(), saltNumber);

    if (allAdmins.rowCount < 2) {
      if (allAdmins.rowCount === 0) {
        newAdmin = {
          username: username,
          email: email,
          phone: phone,
          password: hashedPassword,
          role: "superAdmin",
        };
      } else {
        newAdmin = {
          username: username,
          email: email,
          phone: phone,
          password: hashedPassword,
          role: "blogAdmin",
        };
      }

      const getAdmin = await pool.query(
        "SELECT * FROM admins WHERE email = $1",
        [email]
      );

      if (getAdmin.rowCount > 0) {
        const resObj = {
          message:
            "Registration failed! Admin already registered, please login...",
          addedToAdmin: getAdmin.rows,
        };

        res.json(resObj);
      } else {
        const addAdmin = await pool.query(
          "INSERT INTO admins (username, email, phone, password, role) VALUES ($1, $2, $3, $4, $5) returning *",
          [
            newAdmin.username,
            newAdmin.email,
            newAdmin.phone,
            newAdmin.password,
            newAdmin.role,
          ]
        );

        if (addAdmin.rows[0]) {
          const resObj = {
            message: "Admin registered successfully",
            addedAdmin: addAdmin.rows[0],
          };

          res.json(resObj);
        }
      }
    } else {
      const resObj = {
        message: "Registration failed! Maximum number of Admins reached!!",
        addedAdmin: null,
      };

      res.json(resObj);
    }
  } catch (error) {
    console.error(error);
    res.json(error);
  }
});

// Admin Login
app.post("/api/v1/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const getAdmin = await pool.query("SELECT * FROM admins WHERE email = $1", [
      email,
    ]);

    let admin;

    if (getAdmin.rowCount > 0 && getAdmin.rows.length > 0) {
      admin = {
        id: getAdmin.rows[0].id,
        username: getAdmin.rows[0].username,
        email: getAdmin.rows[0].email,
        phone: getAdmin.rows[0].phone,
        role: getAdmin.rows[0].role,
      };
    } else {
      admin = null;
    }

    if (admin) {
      const passwordCorrect = bcrypt.compareSync(
        password.toString(),
        getAdmin.rows[0].password
      );

      if (passwordCorrect) {
        // const adminEmail = admin.email;
        const adminToken = jwt.sign({ admin }, jwt_secret, {
          expiresIn: "360min",
        });

        res.cookie("adminToken", adminToken);

        const resObj = {
          message: "Admin login successful",
          adminToken: adminToken,
        };

        res.json(resObj);
      } else {
        const resObj = {
          message: "Admin login failed! Incorrect password!!",
        };

        res.json(resObj);
      }
    } else {
      const resObj = {
        message: "Login failed! No Admin found with your email!!",
      };

      res.json(resObj);
    }

    // console.log(getAdmin)

    // const hashedPassword = await bcrypt.hash(password, saltNumber);
  } catch (error) {
    console.error(error);
  }
});

const verifyUser = (req, res, next) => {
  const adminToken = req.cookies.adminToken;

  if (!adminToken) {
    return res.json({ error: "You are not AUTHENTICATED, please login!" });
  } else {
    jwt.verify(adminToken, jwt_secret, (error, decoded) => {
      if (error) {
        return res.json({ error: "Invalid TOKEN, please login!" });
      } else {
        req.admin = decoded.admin;
        next();
      }
    });
  }
};

// Verify Auth
app.get("/api/v1/admin", verifyUser, async (req, res) => {
  try {
    return res.json({
      message: "You have been AUTHENTICATED, continue with your work...",
      isAuth: true,
      adminInfo: req.admin,
    });
  } catch (error) {
    console.error(error);
  }
});

// Logout Admin
app.get("/api/v1/admin/logout", async (req, res) => {
  res.clearCookie("adminToken");
  res.json({ message: "Logged out Admin successfully" });
});

// Admin Portfolio Fetch All Items
app.get(
  "/api/v1/admin/portfolio",
  authenticateMiddleware,
  authorizeMiddleware,
  async (req, res) => {
    try {
      const getPortfolioItems = await pool.query("SELECT * FROM portfolio");
      const portfolioItems = getPortfolioItems.rows;
      // console.log(portfolioItems);

      res.json(portfolioItems);
    } catch (error) {
      console.error("Error retrieving portfolio items:", error);
      res
        .status(500)
        .json({ error: "An error occurred while retrieving portfolio items" });
    }
  }
);

// Admin Portfolio Add New Item
app.post(
  "/api/v1/admin/portfolio/add-new-item",
  portfolioFeaturedImageUpload,
  authenticateMiddleware,
  authorizeMiddleware,
  featuredImageErrorMiddleware,
  async (req, res) => {
    if (req.file) {
      try {
        const imageFilePath = req.file.path;
        const folder = "OnimiseaWeb/PortfolioImages";
        const featuredImageUrl = await uploadImage(imageFilePath, folder);

        console.log("Featured Image URL:", featuredImageUrl);

        const getPortfolioItem = await pool.query(
          "SELECT * FROM portfolio WHERE title = $1 AND excerpt = $2 AND featured_image = $3 AND live_url = $4 AND github_url = $5 AND content = $6",
          [
            req.body.title,
            req.body.excerpt,
            featuredImageUrl,
            req.body.live_url,
            req.body.github_url,
            req.body.content,
          ]
        );

        if (getPortfolioItem.rows.length > 0) {
          console.log("Portfolio item is already added!!!");
        } else {
          const addPortfolioItem = await pool.query(
            "INSERT INTO portfolio (title, excerpt, featured_image, live_url, github_url, content) VALUES ($1, $2, $3, $4, $5, $6) returning *",
            [
              req.body.title,
              req.body.excerpt,
              featuredImageUrl,
              req.body.live_url,
              req.body.github_url,
              req.body.content,
            ]
          );

          if (addPortfolioItem.rows[0]) {
            const resObj = {
              message: "Portfolio added successfully",
              addedPortfolioItem: addPortfolioItem.rows[0],
            };

            res.json(resObj);
          }
        }
      } catch (error) {
        console.error(error);
        res.json(error);
      }
    } else {
      res.json({ error: "Please upload a featured image for portfolio item!" });
    }
  }
);

// try {
//   const allAdmins = await pool.query("SELECT * FROM admins");
//   const { username, email, phone, password } = req.body;
//   const hashedPassword = await bcrypt.hash(password.toString(), saltNumber);

//   if (allAdmins.rowCount < 2) {
//     if (allAdmins.rowCount === 0) {
//       newAdmin = {
//         username: username,
//         email: email,
//         phone: phone,
//         password: hashedPassword,
//         role: "superAdmin",
//       };
//     } else {
//       newAdmin = {
//         username: username,
//         email: email,
//         phone: phone,
//         password: hashedPassword,
//         role: "blogAdmin",
//       };
//     }

//     const getAdmin = await pool.query(
//       "SELECT * FROM admins WHERE email = $1",
//       [email]
//     );

//     if (getAdmin.rowCount > 0) {
//       const resObj = {
//         message:
//           "Registration failed! Admin already registered, please login...",
//         addedToAdmin: getAdmin.rows,
//       };

//       res.json(resObj);
//     } else {
//       const addAdmin = await pool.query(
//         "INSERT INTO admins (username, email, phone, password, role) VALUES ($1, $2, $3, $4, $5) returning *",
//         [
//           newAdmin.username,
//           newAdmin.email,
//           newAdmin.phone,
//           newAdmin.password,
//           newAdmin.role,
//         ]
//       );

//       if (addAdmin.rows[0]) {
//         const resObj = {
//           message: "Admin registered successfully",
//           addedAdmin: addAdmin.rows[0],
//         };

//         res.json(resObj);
//       }
//     }
//   } else {
//     const resObj = {
//       message: "Registration failed! Maximum number of Admins reached!!",
//       addedAdmin: null,
//     };

//     res.json(resObj);
//   }
// } catch (error) {
//   console.error(error);
//   res.json(error);
// }

app.listen(port, () => {
  console.log(`Server is running and listening to ${port}...`);
});
