// bun run admin:hash <password> — prints the bcrypt hash to put in ADMIN_PASSWORD_HASH.
import bcrypt from "bcryptjs";

const pw = process.argv[2];
if (!pw) {
  console.error("usage: bun run admin:hash <password>");
  process.exit(1);
}
console.log(bcrypt.hashSync(pw, 12));
