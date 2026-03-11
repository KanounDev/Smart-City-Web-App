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
- Manage categories and service types

## 🛠️ Tech Stack

### Backend
- **Java 17**
- **Spring Boot 3.x**
- **Spring Security** with JWT authentication
- **MongoDB** for flexible data schemas
- **Maven** for dependency management

### Frontend
- **Angular 17+**
- **TypeScript**
- **Leaflet/OpenStreetMap** for map visualization
- **Bootstrap** for responsive design
- **RxJS** for reactive programming

## 📋 Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **Java JDK 17** - [Download](https://adoptium.net/)
- **Maven** (v3.8 or higher) - [Download](https://maven.apache.org/)
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)

## 🚀 Installation

### Clone the Repository
```bash
git clone https://github.com/yourusername/smart-city-platform.git
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
   - The application will automatically create the `smart_city_db` database

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
./mvnw clean install
```
   - On Windows, use `mvnw.cmd clean install`

5. **Run the backend:**
```bash
./mvnw spring-boot:run
```
   The backend will start at `http://localhost:8081`

### Frontend Setup (Angular)

1. **Open a new terminal and navigate to the frontend directory:**
```bash
cd smart-city-frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment (if needed):**
   
   Edit `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8081/api'
   };
   ```

4. **Run the frontend:**
```bash
ng serve
```
   The frontend will be available at `http://localhost:4200`

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
   ./mvnw spring-boot:run
   ```

3. **Start the Frontend:**
   ```bash
   cd smart-city-frontend
   ng serve -o  # The -o flag opens the browser automatically
   ```

4. **Access the application:**
   - Frontend: `http://localhost:4200`
   - Backend API: `http://localhost:8081`
