# TeamUp 🚀
> Student team-finding platform — find your study squad

## Features
- 🎯 **Smart recommendations** — matches based on your skills + group
- 👥 **Group-scoped teams** — only students from the same group can join a team
- 📬 **Join requests & notifications** — request to join, accept/decline members
- 🔐 **Three roles**: Student, Teacher, Admin
- 📚 **Multiple team types**: Project, Assignment, Lab, Exam Prep

## Roles
| Role | Can do |
|------|--------|
| **Student** | Browse teams, create teams, join teams, manage own profile |
| **Teacher** | Create groups & subjects, view all teams |
| **Admin** | Everything + manage all users, roles, groups, subjects |

## Default Admin Login
```
Email: admin@teamup.kz
Password: admin123
```
> ⚠️ Change the admin password after first login!

## Deploy to Render

### Option 1: One-click with render.yaml
1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and deploy

### Option 2: Manual
1. New Web Service → connect GitHub repo
2. Build: `npm install`
3. Start: `npm start`
4. Add env var: `JWT_SECRET` = any random string
5. Add a **Disk** mount at `/var/data` (for SQLite persistence)

## Local Development
```bash
npm install
npm run dev   # needs nodemon: npm i -g nodemon
# or
npm start
```
Open http://localhost:3000

## Setup Flow
1. Admin logs in → creates **Groups** (e.g. "CS-2301", "IT-2202")
2. Admin/Teacher creates **Subjects** (e.g. "Web Development", "Databases")
3. Students **register** → pick their group
4. Students create **Team Requests** for specific subjects
5. Other students from same group **browse & apply**
6. Team creator **accepts/rejects** applicants
7. 🎉 Team is formed!
