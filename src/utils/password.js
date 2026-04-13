const hashPassword = async (bcrypt, plainPassword) => bcrypt.hash(plainPassword, 12);
const comparePassword = async (bcrypt, plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword);

module.exports = {
  hashPassword,
  comparePassword
};
