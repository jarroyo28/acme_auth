const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");
const saltRounds = 10;

const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

// Associations
User.hasMany(Note);
Note.belongsTo(User);

User.byToken = async (token) => {
  try {
    // Verifying the users token with the secret key
    const verifiedToken = jwt.verify(token, process.env.JWT);
    // The token that is verified has info on it
    // like the usersId
    console.log(verifiedToken);
    // Using the verified tokens info I find the user
    // and return it
    const user = await User.findByPk(verifiedToken.userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (user) {
    // If there is a user in the DB i create a token using jwt.sign with the
    // payload being the user id and the secretkey being my JWT environment variable
    // I return that token
    // I use bcrypt.compare in order to check if the password entered by the user matches the hashed password stored in the db
    const correct = await bcrypt.compare(password, user.password);
    if (correct) {
      const token = jwt.sign({ userId: user.id }, process.env.JWT);
      return token;
    }
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  // Create a list of notes
  const notes = [
    { text: "Take out trash" },
    { text: "mop" },
    { text: "buy groceries" },
  ];

  // Create each note in the db
  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );

  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  // Assign those notes to a particular user in the db
  await lucy.setNotes(note1);
  await moe.setNotes([note2, note3]);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

// I use a beforeCreate hook in order to hash the password before the password gets stored in the db
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, saltRounds);
});

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
