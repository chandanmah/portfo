const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your admin password: ', (password) => {
  if (!password || password.length < 6) {
    console.log('Password must be at least 6 characters long.');
    rl.close();
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  
  console.log('\n=== PASSWORD HASH GENERATED ===');
  console.log('Add this to your Vercel environment variables:');
  console.log('\nADMIN_PASSWORD_HASH=' + hash);
  console.log('\n=== COPY THE HASH ABOVE ===\n');
  
  rl.close();
});