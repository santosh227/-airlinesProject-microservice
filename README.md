Airline Booking Microservices Platform : 

Enterprise-grade airline booking backend built with Node.js microservices architecture. Features JWT authentication, MongoDB database, Razorpay payment integration, Nginx API gateway, and PM2 deployment on AWS EC2.

Overview : 
A comprehensive airline booking platform engineered with modern microservices architecture, demonstrating enterprise-level software development capabilities and production deployment practices.

Problem Solved: Traditional monolithic airline booking systems struggle with scalability, single points of failure, and deployment complexity during peak travel seasons.

Solution: This microservices platform addresses these challenges through service isolation, independent scaling, technology diversity, and zero-downtime deployments.

Features : 

1) Authentication & Security Service: 
JWT-based authentication with secure token management
Password encryption using bcrypt with salt rounds
Input validation and data sanitization
HTTPS encryption for secure communication 

2) Flight Management Service : Comprehensive flight catalog with search capabilities,Advanced filtering by date, price, route, airline ,Real-time availability tracking and updates,Seat inventory management with overbooking prevention,Dynamic pricing support for revenue optimization

3) Flight Booking Service : Multi-step booking process with seat selection, Passenger information management and validation, Booking modifications and cancellation workflows, Complete booking history and status tracking

4)Payment Service : Razorpay payment gateway integration, Multiple payment methods (cards, UPI, wallets, banking), Secure transaction handling with PCI compliance, Automated refund processing workflows, Comprehensive payment history tracking.


POSTMAN API Documentation Link : 
  http://bit.ly/3VVkoEJ


Services URL's : 

Auth Service :

http://3.110.161.234/authService/health  

Flight Management Service :

http://3.110.161.234/flightService/health

Flight Booking Service :

http://3.110.161.234/bookingService/health

 Payment Service :

http://3.110.161.234/paymentService/health

System Architecture



Installation : 

Step 1: Clone Repository

```git
git clone https://github.com/santosh227/airline-booking-microservices.git
cd airline-booking-microservices
```
Step 2: Install Dependencies 
```git
# Install dependencies for all services
cd auth-service && npm install && cd ..
cd flight-management-service && npm install && cd ..
cd flight-booking-service && npm install && cd ..
cd payment-service && npm install && cd ..
```
Step 3: Environment Configuration
```git
# Copy environment templates
cp auth-service/.env.example auth-service/.env
cp flight-management-service/.env.example flight-management-service/.env
cp flight-booking-service/.env.example flight-booking-service/.env
cp payment-service/.env.example payment-service/.env
```
Step 4: Configure Environment Variables
Auth Service (.env):
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/auth_service
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```
Flight Management Service (.env):
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/flight_service
```
Booking Service (.env):
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/booking_service
```
Payment Service (.env):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/payment_service
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```
Step 5: Start Services
```
npm install -g pm2
pm2 start ecosystem.config.js
pm2 status
```
Development Mode:
```
# Terminal 1 - Auth Service
cd auth-service && npm run dev

# Terminal 2 - Flight Service
cd flight-management-service && npm run dev

# Terminal 3 - Booking Service
cd flight-booking-service && npm run dev

# Terminal 4 - Payment Service
cd payment-service && npm run dev
```
Step 6: Verify Installation
```
# Check all services are running
 http://localhost:5001/authService/health
 http://localhost:3000/flightService/health
 http://localhost:4000/bookingService/health
 http://localhost:5000/paymentService/health
```

 Deployment : 
 AWS EC2 Production Setup 
 Server Configuration:
 ```
# Connect to EC2 instance
ssh -i "your-key.pem" ec2-user@3.110.161.234

# Update system
sudo yum update -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install MongoDB
sudo yum install -y mongodb-server
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```
Application Deployment on AWS :
```
# Clone and setup
git clone https://github.com/santosh227/airline-booking-microservices.git
cd airline-booking-microservices

# Install dependencies and configure environment
npm run install:all
# Configure .env files for production

# Start services with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```
