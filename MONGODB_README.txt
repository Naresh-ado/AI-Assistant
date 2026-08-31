================================================================================
           MONGODB USAGE GUIDE - AI ACADEMIC COPILOT PROJECT
================================================================================

This file explains how MongoDB is used in this project and how to view the
database using MongoDB Compass.

--------------------------------------------------------------------------------
1. WHAT IS MONGODB IN THIS PROJECT?
--------------------------------------------------------------------------------

This project uses MongoDB as its primary database to store all application
data persistently. The backend server (Node.js + Express) connects to a local
MongoDB instance using the Mongoose ODM (Object Document Mapper) library.

Connection string (found in .env.local):
  MONGODB_URI=mongodb://127.0.0.1:27017/ai_academic_copilot

This means:
  - Host    : 127.0.0.1 (your local machine)
  - Port    : 27017 (default MongoDB port)
  - Database: ai_academic_copilot

--------------------------------------------------------------------------------
2. HOW MONGODB IS USED IN THE CODE
--------------------------------------------------------------------------------

The server connects to MongoDB inside server/index.js:

  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });

If MongoDB is not running, the server falls back to an in-memory store
(data will be LOST on restart). Always start MongoDB before starting the
backend server.

--------------------------------------------------------------------------------
3. DATABASE COLLECTIONS (TABLES)
--------------------------------------------------------------------------------

Each Mongoose model creates a separate collection in MongoDB. Here are all
the collections used in this project:

COLLECTION: users
  File: server/models/User.js
  Stores user login accounts.
  Fields:
    - email          : String (unique, required)
    - password       : String (hashed, required)
    - full_name      : String
    - created_date   : Date

COLLECTION: studentprofiles
  File: server/models/StudentProfile.js
  Stores the academic profile of each student.
  Fields:
    - created_by_id              : String (links to user)
    - display_name               : String
    - age_range                  : String
    - academic_level             : String (e.g. undergraduate)
    - field_of_study             : String
    - institution_name           : String
    - target_gpa / current_gpa   : String
    - daily_study_capacity_hours : Number
    - preferred_study_time       : String
    - max_focus_session_minutes  : Number
    - burnout_risk_level         : String
    - motivation_style           : String
    - weekly_off_days            : [String]
    - companion_avatar           : String
    - companion_name             : String
    - companion_tone             : String
    - created_date               : Date

COLLECTION: academictasks
  File: server/models/AcademicTask.js
  Stores assignments, exams, and other academic tasks.
  Fields:
    - created_by_id      : String (links to user)
    - course_id          : String
    - topic_ids          : [String]
    - title              : String (required)
    - type               : String (e.g. assignment, exam)
    - due_date           : Date
    - weight_percentage  : Number
    - estimated_hours    : Number
    - status             : String (pending / completed)
    - priority           : String (low / medium / high)
    - notes              : String
    - created_date       : Date

COLLECTION: courses
  File: server/models/Course.js
  Stores the courses a student is enrolled in.

COLLECTION: topics
  File: server/models/Topic.js
  Stores topics within courses.

COLLECTION: studyplans
  File: server/models/StudyPlan.js
  Stores AI-generated study plans for students.

COLLECTION: plansessions
  File: server/models/PlanSession.js
  Stores individual study sessions within a study plan.

COLLECTION: companionmessages
  File: server/models/CompanionMessage.js
  Stores chat history between the student and their AI companion.

--------------------------------------------------------------------------------
4. HOW TO START MONGODB LOCALLY
--------------------------------------------------------------------------------

OPTION A - If MongoDB is installed as a Windows Service (most common):
  1. Open Services (Win + R -> type "services.msc" -> Enter)
  2. Find "MongoDB" in the list
  3. Right-click -> Start
  OR run this in PowerShell (as Administrator):
    net start MongoDB

OPTION B - Start MongoDB manually from the command line:
  mongod --dbpath "C:\data\db"
  (Replace C:\data\db with your actual MongoDB data directory)

OPTION C - If MongoDB is NOT installed yet:
  Download from: https://www.mongodb.com/try/download/community
  Install Community Edition and enable "Install MongoDB as a Service".

--------------------------------------------------------------------------------
5. HOW TO VIEW THE DATABASE IN MONGODB COMPASS
--------------------------------------------------------------------------------

MongoDB Compass is the official GUI tool for viewing and managing MongoDB data.

STEP 1 - Download MongoDB Compass (if not installed):
  Go to: https://www.mongodb.com/try/download/compass
  Download and install the free Community edition.

STEP 2 - Open MongoDB Compass.

STEP 3 - Connect to your local database:
  When Compass opens, you will see a "New Connection" screen.
  In the connection string field, enter:
    mongodb://127.0.0.1:27017
  Then click the green "Connect" button.

STEP 4 - Find your database:
  After connecting, you will see a list of databases on the left sidebar.
  Look for: ai_academic_copilot
  Click on it to expand and see all the collections.

STEP 5 - Browse the collections:
  Click on any collection name (e.g. "users", "academictasks") to open it.
  You will see all the documents (records) stored in that collection.
  You can:
    - Browse documents in a visual card view or JSON view
    - Filter documents using the filter bar at the top
      Example filter to find a specific user by email:
        { "email": "student@example.com" }
    - Sort, project, and paginate through results
    - Manually add, edit, or delete documents (use carefully!)

STEP 6 - Use the Schema tab:
  Click the "Schema" tab inside any collection to see a visual summary of
  the fields and data types stored in that collection.

STEP 7 - Use the Aggregation tab:
  For more advanced data analysis, use the "Aggregations" tab to build
  MongoDB aggregation pipelines visually.

--------------------------------------------------------------------------------
6. QUICK REFERENCE - CONNECTION DETAILS FOR COMPASS
--------------------------------------------------------------------------------

  Connection String : mongodb://127.0.0.1:27017
  Database Name     : ai_academic_copilot
  Port              : 27017
  Host              : 127.0.0.1 (localhost)
  Authentication    : None (local development, no username/password needed)

--------------------------------------------------------------------------------
7. IMPORTANT NOTES
--------------------------------------------------------------------------------

- Make sure MongoDB is running BEFORE starting the backend server (npm run server). If MongoDB is not running, data will not be saved.

- The .env.local file contains the MongoDB connection string. Do NOT commit
  this file to git. It is already listed in .gitignore.

- In development mode, if MongoDB is unreachable, the server uses an
  in-memory fallback store. All data stored in memory is LOST when the
  server restarts. Always verify MongoDB is connected by checking:
    http://localhost:5000/api/health
  You should see: "mongodb": "connected"

- Mongoose automatically creates collections the first time a document is
  inserted into them. If you have just set up the project and no one has
  registered yet, the collections may not appear in Compass yet. Register
  a user through the app to create the first documents.

================================================================================
                             END OF MONGODB README
================================================================================
