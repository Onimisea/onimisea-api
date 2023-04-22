require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors({
  credentials: true,
  origin: "http://localhost:3000"
}));
app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 2096;
const jwt_secret = process.env.JWT_SECRET;
const saltNumber = 10;

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

app.post("/api/v1/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const getAdmin = await pool.query("SELECT * FROM admins WHERE email = $1", [
      email,
    ]);

    let admin;

    if (getAdmin.rowCount > 0 && getAdmin.rows.length > 0) {
      admin = getAdmin.rows[0];
    } else {
      admin = null;
    }

    if (admin) {
      const passwordCorrect = bcrypt.compareSync(
        password.toString(),
        admin.password
      );

      if (passwordCorrect) {
        const adminEmail = admin.email;
        const adminToken = jwt.sign({ adminEmail }, jwt_secret, {
          expiresIn: "15mins",
        });

        res.cookie("adminToken", adminToken);

        console.log(adminToken);

        const resObj = {
          message: "Admin login successful",
          loggedInAdmin: admin,
        };

        res.json(resObj);
      } else {
        const resObj = {
          message: "Admin login failed! Incorrect password!!",
          loggedInAdmin: null,
        };

        res.json(resObj);
      }
    } else {
      const resObj = {
        message: "Login failed! No Admin found with your email!!",
        loggedInAdmin: null,
      };

      res.json(resObj);
    }

    // console.log(getAdmin)

    // const hashedPassword = await bcrypt.hash(password, saltNumber);
  } catch (error) {
    console.error(error);
  }
});

app.listen(port, () => {
  console.log(`Server is running and listening to ${port}...`);
});
