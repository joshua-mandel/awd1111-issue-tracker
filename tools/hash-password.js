import bcrypt from 'bcrypt';

async function hashPassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

hashPassword('password').then(hash => console.log(hash));