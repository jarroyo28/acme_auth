const express = require("express");
const app = express();
app.use(express.json());
const {
  models: { User, Note },
} = require("./db");
const path = require("path");

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", async (req, res, next) => {
  try {
    res.send(await User.byToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

app.delete("/api/auth", async (req, res, next) => {
  try {
    res.send();
  } catch (ex) {
    next(ex);
  }
});

// This route is to get a specific user's notes
app.get("/api/users/:id/notes", async (req, res, next) => {
  try {
    // I first find the user via their token
    const user = await User.byToken(req.headers.authorization);
    // Then I grab the users notes using a magic method
    const notes = await user.getNotes();

    console.log(user.id);
    console.log(req.params.id);

    if (user.id == req.params.id) {
      res.send(notes);
    } else {
      res.status(401);
    }
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
