const user = require("../model/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

exports.reg = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Password validation (at least 8 characters, one uppercase, one lowercase, one number, and one special character)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters, include an uppercase, lowercase, number, and special character",
      });
    }

    // Phone validation (ensure phone number contains exactly 10 or more digits)
    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ error: "Phone number must be at least 10 digits" });
    }

    // Name validation (ensure it's a full name, contains two or more words, each word starts with a capital letter)
    const nameRegex = /^[A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({ error: "Invalid full name format" });
    }

    const sameemail = await user.findOne({ where: { email: email } });
    if (sameemail) {
      res.status(400).send("User already Exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.create({
      full_name: name,
      password: hashedPassword,
      email: email,
      phone_no: phone,
    });
    res.status(200).send("User Registered Successfully");
  } catch (error) {
    console.error("Error during registration", error);
    return res.status(500).send("Internal Server Error", error);
  }
};

exports.auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send("No token provided");
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "top_secret_key", async (err, decoded) => {
      if (err) {
        return res.status(401).send("Invalid token");
      }

      const foundUser = await user.findOne({ where: { email: decoded.email } });
      if (!foundUser) {
        return res.status(404).send("User not found");
      }
      req.user = foundUser;
      next();
    });
  } catch (error) {
    console.error("Error during token verification:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.login = async (req, res) => {
  try {
    const { Email, Password } = req.body;

    const foundUser = await user.findOne({ where: { email: Email } });
    if (!foundUser) {
      return res.status(404).send("pls enter correct credentials");
    } else {
      const passwordMatch = await bcrypt.compare(Password, foundUser.password);
      if (!passwordMatch) {
        return res.status(404).send("pls enter correct credentials");
      }
      const userData = foundUser.toJSON();
      delete userData.password;
      const token = jwt.sign(userData, "top_secret_key", { expiresIn: "10h" });
      res.status(200).json({
        token: token,
        userData: userData,
      });
    }
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).send("pls enter correct credentials");
  }
};

exports.data = async (req, res) => {
  const searchQuery = req.body.searchQuery;

  try {
    if (searchQuery !== undefined) {
      const users = await user.findAll({
        where: {
          [Op.or]: [
            { full_name: { [Op.like]: `${searchQuery}%` } },
            { email: { [Op.like]: `${searchQuery}%` } },
            { phone_no: { [Op.like]: `${searchQuery}%` } },
          ],
        },
      });

      return res.json(users);
    } else {
      const allUsers = await user.findAll({
        attributes: { exclude: ["password"] },
      });
      return res.json(allUsers);
    }
  } catch (err) {
    console.error("Error executing query:", err);
    return res.status(500).json({
      error: "An error occurred while retrieving data.",
      details: err.message,
    });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, "top_secret_key");
    const userId = decoded.id;

    const userToDelete = await user.findByPk(userId);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userToDelete.deletedAt) {
      return res.status(400).json({ message: "User is already deleted" });
    }

    await userToDelete.destroy();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
};

exports.sortUsers = async (req, res) => {
  const { sortBy } = req.body;

  const validSortOptions = ["name", "email", "phone"];
  if (!validSortOptions.includes(sortBy)) {
    return res.status(400).json({
      error: "Invalid sort parameter. Must be 'name', 'email', or 'phone'.",
    });
  }

  try {
    let users;
    if (sortBy === "name") {
      users = await user.findAll({
        order: [["full_name", "ASC"]],
        attributes: { exclude: ["password"] },
      });
    } else if (sortBy === "email") {
      users = await user.findAll({
        order: [["email", "ASC"]],
        attributes: { exclude: ["password"] },
      });
    } else if (sortBy === "phone") {
      users = await user.findAll({
        order: [["phone_no", "ASC"]],
        attributes: { exclude: ["password"] },
      });
    }

    return res.json(users);
  } catch (error) {
    console.error("Error sorting users:", error);
    return res.status(500).json({
      error: "An error occurred while sorting data.",
      details: error.message,
    });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, "top_secret_key");
    const userId = decoded.id;

    const userToDelete = await user.findByPk(userId);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userToDelete.deletedAt) {
      return res.status(400).json({ message: "User is already deleted" });
    }

    await userToDelete.destroy();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id, name, phone, newpassword } = req.body;

    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ error: "Phone number must be at least 10 digits" });
    }

    const nameRegex = /^[A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({ error: "Invalid full name format" });
    }

    if (
      newpassword &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(
        newpassword
      )
    ) {
      return toast.error(
        "Password must be at least 8 characters, include an uppercase, lowercase, number, and special character"
      );
    }

    const updateData = {
      full_name: name,
      phone_no: phone,
    };

    if (newpassword) {
      const hashedPassword = await bcrypt.hash(newpassword, 10);
      updateData.password = hashedPassword;
    }

    const [updatedRows] = await user.update(updateData, { where: { id: id } });

    if (updatedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).send("User Updated");
  } catch (error) {
    console.error("Error during user update", error);
    return res.status(500).send("Internal Server Error");
  }
};
