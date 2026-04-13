const crypto = require('crypto');

const generateNumericOtp = (length = 6) => {
  const min = 10 ** (length - 1);
  const max = (10 ** length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

module.exports = {
  generateNumericOtp,
  hashOtp
};
