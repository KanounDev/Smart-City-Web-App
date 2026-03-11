# Smart City Platform 🏙️

A modern web application for digital management and visualization of urban services, enabling citizens to discover new shops and services while streamlining administrative procedures for business owners and municipal authorities.

## 📋 Table of Contents
- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend Setup (Spring Boot)](#backend-setup-spring-boot)
  - [Frontend Setup (Angular)](#frontend-setup-angular)
- [Running the Application](#running-the-application)

## 🎯 About the Project

The Smart City Platform addresses the need for a centralized digital solution to manage and communicate urban services and commercial activities. Traditional methods of sharing information about new shops and services through informal channels are limited and non-centralized. Additionally, administrative procedures for opening new businesses often require physical visits and paper documentation.

**Our solution provides:**
- A map-based interface for citizens to discover approved shops and services
- Digital submission and tracking of business opening requests
- Streamlined administrative review and approval process for municipal authorities
- Centralized, transparent, and efficient urban service management

## ✨ Key Features

### For Citizens 👥
- Interactive city map visualizing new shops and services
- Filter and search services by category or location
- Access detailed information about each establishment
- Stay informed about urban development

### For Business Owners 💼
- Submit online requests to open shops or introduce services
- Upload supporting documents digitally
- Track request status in real-time
- Communicate with municipal authorities through the platform

### For Municipal Authorities 🏛️
- Review incoming requests with detailed information
- Request additional documents or clarifications
- Approve or reject applications digitally
- Manually position approved services on the city map (ensuring accuracy)

## 🛠️ Tech Stack

### Backend
- **Spring Boot**
- **MongoDB**

### Frontend
- **Angular**
- **TypeScript**

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Backend Requirements
- **Java JDK 17** (or higher)
  - Download from [Adoptium](https://adoptium.net/) or [Oracle](https://www.oracle.com/java/technologies/javase-downloads.html)
  - Verify installation: `java -version`
  
- **Maven** (v3.8 or higher)
  - Download from [Apache Maven](https://maven.apache.org/download.cgi)
  - Installation guide: [Maven Installation Instructions](https://maven.apache.org/install.html)
  - Verify installation: `mvn -version`

- **MongoDB** (v6 or higher)
  - Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
  - Installation guides:
    - [Windows Installation](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)
    - [macOS Installation](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/)
    - [Linux Installation](https://docs.mongodb.com/manual/administration/install-on-linux/)
  - Verify installation: `mongod --version`
  - Ensure MongoDB service is running:
    ```bash
    # On Linux/macOS
    sudo systemctl start mongod
    # or
    mongod
    
    # On Windows (Run as Administrator)
    net start MongoDB
    ```

### Frontend Requirements
- **Node.js** (v18 or higher)
  - Download from [Node.js Official Website](https://nodejs.org/)
  - Includes npm (Node Package Manager)
  - Verify installation:
    ```bash
    node --version
    npm --version
    ```

- **Angular CLI** (v17 or higher)
  - Install globally via npm:
    ```bash
    npm install -g @angular/cli
    ```
  - Verify installation:
    ```bash
    ng version
    ```

### Version Control
- **Git**
  - Download from [Git Official Website](https://git-scm.com/downloads)
  - Installation guides: [Git Setup Instructions](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
  - Verify installation:
    ```bash
    git --version
    ```

### Optional but Recommended
- **Postman** or **Insomnia** - For API testing
  - [Download Postman](https://www.postman.com/downloads/)
  - [Download Insomnia](https://insomnia.rest/download/)

- **MongoDB Compass** - GUI for MongoDB
  - [Download MongoDB Compass](https://www.mongodb.com/products/compass)

- **Visual Studio Code** - Recommended IDE
  - [Download VS Code](https://code.visualstudio.com/)
  - Recommended extensions:
    - Angular Language Service
    - Java Extension Pack
    - Spring Boot Extension Pack
    - MongoDB for VS Code
    - Prettier - Code formatter

## 🚀 Installation

### Clone the Repository
```bash
git clone https://github.com/KanounDev/Smart-City-Web-App.git
cd smart-city-platform
```

### Backend Setup (Spring Boot)

1. **Navigate to the backend directory:**
```bash
cd smartcity
```

2. **Configure MongoDB:**
   - Ensure MongoDB is running locally
   - Default connection: `mongodb://localhost:27017`
   - Create the `smart_city_db` database

3. **Configure application properties:**
   
   The `src/main/resources/application.properties` file is already configured:
   ```properties
   spring.application.name=smartcity
   server.port=8081
   spring.mongodb.uri=mongodb://localhost:27017/smart_city_db
   jwt.secret=51f19777014e4583270246de3f321bee6007844872f9b706e4391dc6e1eb94f0
   ```
   
   > **Note:** In production, change the JWT secret to a secure, unique value.

4. **Build the project:**
```bash
mvn clean install
```

5. **Run the backend:**
```bash
mvn spring-boot:run
```
   The backend will start at `http://localhost:8081`

### Frontend Setup (Angular)

1. **Open a new terminal and navigate to the frontend directory:**
```bash
cd smart-city-frontend
```

2. **Install dependencies:**
```bash
npm install --legacy-peer-deps
```

3. **Run the frontend:**
```bash
ng serve
```
   The frontend will be available at `http://localhost:4200`

### Troubleshooting Frontend Installation

If you encounter any issues during `npm install --legacy-peer-deps`, try these steps:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
# On Windows PowerShell:
# Remove-Item -Recurse -Force node_modules, package-lock.json

# Retry installation
npm install --legacy-peer-deps
```

> **Note:** The `node_modules` folder and `package-lock.json` are not included in the repository. They will be generated locally when you run `npm install --legacy-peer-deps`.
```

## 🏃 Running the Application

### Quick Start (Both Backend and Frontend)

1. **Start MongoDB:**
   ```bash
   # On Linux/Mac
   sudo systemctl start mongod
   
   # On Windows (run as Administrator)
   net start MongoDB
   
   # Or simply run the MongoDB daemon
   mongod
   ```

2. **Start the Backend:**
   ```bash
   cd smartcity
   mvn spring-boot:run
   ```

3. **Start the Frontend:**
   ```bash
   cd smart-city-frontend
   ng serve -o  # The -o flag opens the browser automatically
   ```

4. **Access the application:**
   - Frontend: `http://localhost:4200`
   - Backend API: `http://localhost:8081`
