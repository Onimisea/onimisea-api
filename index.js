require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);
app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 2096;
const jwt_secret = process.env.JWT_SECRET;
const saltNumber = 10;

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
          expiresIn: "60min",
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

app.listen(port, () => {
  console.log(`Server is running and listening to ${port}...`);
});
