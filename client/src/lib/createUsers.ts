import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import bcrypt from "bcryptjs";

const generatePassword = (length = 10) => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const createUsers = async () => {
  await connectDB();

  const inputFilePath = path.join(process.cwd(), "public/users.csv"); // CSV to read
  const outputFilePath = path.join(process.cwd(), "public/users_credentials.csv"); // CSV to write

  const users: Array<{ name: string; teamname: string; email: string }> = [];

  // Write header to output CSV
  fs.writeFileSync(outputFilePath, "email,password\n", { flag: "w" });

  fs.createReadStream(inputFilePath)
    .pipe(csv())
    .on("data", (row) => users.push(row))
    .on("end", async () => {
      console.log(`Read ${users.length} users from CSV`);

      for (const user of users) {
        const randomPassword = generatePassword(12);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        await User.create({
          name: user.name,
          teamName: user.teamname,
          email: user.email,
          password: hashedPassword,
          submissionsLeft: 10, // default
        });

        // Append email and plain password to output CSV
        fs.appendFileSync(
          outputFilePath,
          `${user.email},${randomPassword}\n`,
          "utf8"
        );

        console.log(`Created user ${user.email} with password: ${randomPassword}`);
      }

      console.log(`✅ All users created successfully! Credentials saved to ${outputFilePath}`);
    });
};

export default createUsers;
