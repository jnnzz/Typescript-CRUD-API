# TypeScript CRUD API

A robust REST API built with Express, TypeScript, Sequelize (MySQL), and Joi validation. This project provides a full CRUD (Create, Read, Update, Delete) implementation for a `User` entity.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/installer/) (Running locally or remotely) 
- [Postman](https://www.postman.com/) (For testing the API)

## Setup & Installation

1. **Clone the repository and install dependencies:**
   ```bash
   cd typescript-crud-api
   npm install
   ```

2. **Configure the Database:**
   Open `config.json` in the root of the project and update the database credentials to match your MySQL server:
   ```json
   {
       "database": {
           "host": "localhost",
           "port": 3306,
           "user": "root",        // Change to your MySQL user
           "password": "",        // Change to your MySQL password
           "database": "typescript_crud_api"
       }, 
       "jwtSecret": "change-this-in-production-123!"
   }
   ```
   *Note: You do not need to create the database manually. The application will automatically connect to MySQL and execute `CREATE DATABASE IF NOT EXISTS typescript_crud_api` upon startup.*

## Running the Application

To start the server in development mode (with hot-reloading via `nodemon` and `ts-node`), run:

```bash
npm run dev
```

The server will start on `http://localhost:4000`. You will see the following logs if successful:
```
Database initialized and models synched
Server running on http://localhost:4000
```

## Testing the API

You can use **Postman** or **cURL** to interact with the API endpoints.

### 1. Create a User (POST `/users`)

**Endpoint**: `POST http://localhost:4000/users`
**Headers**: `Content-Type: application/json`

**Body (`raw` -> `JSON`):**
```json
{
  "title": "Mr",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "password": "secret123",
  "confirmPassword": "secret123",
  "role": "User"
}
```
**Important Testing Note:** 
- The API uses strict Joi validation. `password` and `confirmPassword` MUST be provided together and must exactly match. 
- If you receive a `400 Bad Request` with `"password" missing required peer "confirmPassword"`, make sure you have saved your Postman request (`Ctrl+S`) and that there are no hidden spaces in your JSON keys.

### 2. Get All Users (GET `/users`)

**Endpoint**: `GET http://localhost:4000/users`
Returns an array of all users (passwords are excluded from the output by the service layer).

### 3. Get User By ID (GET `/users/:id`)

**Endpoint**: `GET http://localhost:4000/users/1`
Returns a specific user by their ID.

### 4. Update a User (PUT `/users/:id`)

**Endpoint**: `PUT http://localhost:4000/users/1`
**Headers**: `Content-Type: application/json`

**Body (`raw` -> `JSON`):**
```json
{
  "firstName": "Janet"
}
```
*Note: All fields are optional when updating. If you update the password, you must again provide the matching `confirmPassword`.*

### 5. Delete a User (DELETE `/users/:id`)

**Endpoint**: `DELETE http://localhost:4000/users/1`
Deletes the user with the specified ID.

## Available Scripts

- `npm run build` - Compiles the TypeScript code into JavaScript in the `dist` folder.
- `npm start` - Runs the compiled JavaScript code from the `dist` folder.
- `npm run dev` - Runs the development server with live-reloading.
