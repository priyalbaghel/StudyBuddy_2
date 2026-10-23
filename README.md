# StudyBuddy

StudyBuddy is a web-based study platform that helps students turn their study material into useful revision resources. Instead of manually preparing notes, flashcards, and questions from a PDF, students can upload their material and use AI-powered features to make revision easier.

The project uses Google's Gemini API for AI-generated study content and MongoDB to store application data.

##  Features

-  *PDF Upload:* Upload study material in PDF format and extract its text for further processing.
-  *Smart Notes:* Generate concise study notes from uploaded material.
-  *AI-Generated Flashcards:* Create flashcards from study material for quick revision.
-  *Quiz Generation:* Generate quizzes based on uploaded content to test understanding.
-  *Viva Questions:* Generate questions to help students prepare for oral examinations.
-  *User Accounts:* Register, log in, and access your study resources through your account.
-  *Dashboard:* Access the application's study features from a central dashboard.

## Tech Stack as follows:

*Frontend*
- HTML
- CSS
- JavaScript
- EJS templates

*Backend*
- Node.js
- Express.js

*Database*
- MongoDB Atlas
- Mongoose

*AI Integration*
- Google Gemini API

*Deployment*
- Render

## How It Works

1. Create an account or log in to StudyBuddy.
2. Upload a PDF containing your study material.
3. The application extracts the text from the document.
4. Choose a feature, such as Smart Notes, Flashcards, Quiz Generation, or Viva Questions.
5. The application uses the Gemini API to generate study content from the extracted material.
6. Access your study resources through the application.

 *Note:* Extracted document text is stored in MongoDB for application use. Temporary uploaded PDF files are removed after processing; the original PDFs are not retained as permanent uploads.

## 🚀 Getting Started

Follow these steps to run StudyBuddy locally.

### 📋 Prerequisites

Make sure you have the following installed or available:

- [Node.js](https://nodejs.org/)
- npm, included with Node.js
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account or another compatible MongoDB deployment
- A [Google AI Studio](https://aistudio.google.com/) API key with access to the Gemini model used by the application

### 1️⃣ Clone the Repository

bash
git clone https://github.com/Jackboes/StudyBuddy.git


Move into the project directory:

bash
cd StudyBuddy


### 2️⃣ Install Dependencies

bash
npm install


### 3️⃣ Configure Environment Variables 🔑

Create a .env file in the project's root directory and add:

env
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_private_session_secret


Replace the placeholder values with your own credentials.

- MONGO_URI: MongoDB connection string for your database.
- GEMINI_API_KEY: API key used for Gemini requests.
- SESSION_SECRET: A strong, randomly generated secret used for session security.

⚠️ Keep the .env file private. Never commit real credentials or API keys to GitHub.

### 4️⃣ Run the Application ▶️

Start the application using:

bash
npm start


If the server starts successfully, open the local URL configured by the application in your browser. The default development URL is commonly http://localhost:3000, provided port 3000 is available and configured by the application.

## ☁️ Deployment

StudyBuddy is deployed using Render.

To deploy your own instance:

1. Push the project to a GitHub repository.
2. Create a new Web Service on [Render](https://render.com/).
3. Connect the GitHub repository.
4. Set the build command to npm install.
5. Set the start command to npm start.
6. Add MONGO_URI, GEMINI_API_KEY, and SESSION_SECRET in the Render environment settings.
7. Ensure MongoDB Atlas permits connections from the deployed service.
8. Deploy the application and check the service logs for errors.

Render provides the PORT environment variable for the running web service.

🔄 When changes are pushed to the connected GitHub branch, Render can deploy the updated version automatically if automatic deployment is enabled.

## 🐛 Troubleshooting

*MongoDB connection errors*
- Verify that MONGO_URI is configured correctly.
- Check the database username and password.
- Check MongoDB Atlas network access settings.
- Review Render logs for connection errors.

*AI features not generating content*
- Verify that GEMINI_API_KEY is valid.
- Check the Gemini API project's quota and rate limits.
- Check whether the selected model is available to your project.
- Review server logs for API errors or temporary service failures.

*Application fails to start*
- Run npm install if dependencies are missing.
- Check the terminal or Render logs for the underlying error.
- Confirm that all required environment variables are configured.

## 🔒 Security Notes

- Never publish API keys, database passwords, or session secrets.
- Use environment variables for sensitive configuration.
- Use a strong, unique session secret.
- Restrict database access appropriately rather than leaving unnecessary public access enabled.

## 🔮 Future Improvements

Potential areas for further development include:

- More control over AI-generated notes and questions.
- Improved handling of API limits and temporary failures.
- Better tracking of learning progress.
- Additional study and revision tools.
- Improvements to the user interface and overall experience.

## 👨‍💻 Author

Developed as a student project to explore full-stack web development, database integration, and the use of generative AI in education.

## 📄 License

No license has been specified yet. If you plan to make the project open source, consider adding an appropriate LICENSE file to the repository.
