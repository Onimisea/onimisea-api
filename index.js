require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 2096;
const saltNumber = 10;

app.post("/api/v1/admin/register", async (req, res) => {
  try {
    const allAdmins = await pool.query("SELECT * FROM admins");
    const { username, email, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltNumber);

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
  } catch (error) {
    console.error(error);
    res.json(error);
  }
});

app.listen(port, () => {
  console.log(`Server is running and listening to ${port}...`);
});
