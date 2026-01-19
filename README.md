# BioTest - Biology Learning & Testing Platform

A modern web application for biology education, enabling students to take tests on various biology topics, track their progress, and compete on leaderboards. Built with Next.js, Prisma, and MongoDB.

## Features

### Student Features
- **Topic-based Testing**: Take tests organized by different biology topics
- **Progress Tracking**: Monitor your learning progress with detailed statistics
- **Score Management**: Track scores across different topics and tests
- **Leaderboard**: Compete with peers on a public leaderboard
- **History**: Review your test completion history
- **Test Review**: Review completed tests with correct answers and explanations

### Admin Features
- **Task Management**: Create, edit, and manage biology test questions
- **Topic Management**: Organize topics into topic groups
- **User Management**: Manage student accounts and permissions
- **Analytics & Reports**: View detailed statistics and generate reports
- **Admin Dashboard**: Centralized admin interface for system management

### Technical Features
- **Authentication**: Secure user authentication with NextAuth
- **Real-time Updates**: Real-time data synchronization using WebSocket context
- **Dark Mode**: Theme toggle support for user preference
- **Responsive Design**: Mobile-friendly interface
- **Data Parsing**: Built-in parsers for importing test data from various sources

## Tech Stack

### Frontend
- **Next.js 15.5** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - High-quality React components
- **React Hook Form** - Form state management
- **TanStack React Query** - Data fetching and caching
- **TanStack React Table** - Advanced table component
- **Next Themes** - Dark mode support

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - ORM for database management
- **MongoDB** - NoSQL database
- **NextAuth.js** - Authentication solution
- **bcrypt** - Password hashing

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Project Structure

```
/app              - Next.js app router pages and components
  /api           - API routes
  /(req auth)    - Protected routes (authentication required)
  /admin         - Admin panel
  /login         - Authentication page
  /secret        - Secret/hidden features

/components       - Reusable React components
  /ui            - Shadcn/ui components
  /sidebar       - Navigation sidebar components

/contexts         - React context providers
/data             - Data utilities and parsers
  /models        - Data models
  /parsers       - Importers for test data

/hooks            - Custom React hooks
/lib              - Utility functions
/prisma           - Database schema and migrations
/public           - Static assets
```

## Installation

### Prerequisites
- Node.js 18+ (with pnpm package manager)
- MongoDB instance or MongoDB Atlas connection string
- Docker & Docker Compose (optional, for containerized setup)

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/primtive/biotest
cd biotest
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**
Create a `.env.local` file:
```env
DATABASE_URL=<your-mongodb-connection-string>
NEXTAUTH_SECRET=<your-secret-key>
NEXTAUTH_URL=http://localhost:3000
```

4. **Setup database**
```bash
pnpm exec prisma migrate dev
pnpm exec prisma generate
```

5. **Start development server**
```bash
pnpm dev
```

Visit `http://localhost:3000` to access the application.

## Docker Setup

### Development Environment
```bash
docker-compose -f docker-compose-dev.yml up
```

### Production Environment
```bash
docker-compose -f docker-compose.yml up -d
```

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm parser1` - Import test data from biorobot parser

## Data Models

### User
- Manages student accounts with authentication
- Tracks score, test count, and progress percentage
- Belongs to a TopicGroup for organized testing
- Can have UserTopicProgress records for individual topic tracking

### Test
- Represents a single test session for a user
- Contains multiple tasks/questions
- Tracks completion status and answers
- Associated with a TopicGroup

### Task
- Individual test question/problem
- Contains HTML content, answer, and explanation
- Can be reported by users if incorrect
- Belongs to a Topic

### Topic
- Groups related test questions
- Belongs to a TopicGroup (category)
- Tracks user progress through UserTopicProgress

### TopicGroup
- Top-level organization for tests (e.g., "Biology 101", "Advanced Biology")
- Contains multiple Topics

## Database Schema

The application uses MongoDB with Prisma ORM. Key relationships:
- **User** ↔ **TopicGroup** (Many users per group)
- **User** ↔ **Test** (User has many tests)
- **User** ↔ **UserTopicProgress** (Track progress per topic)
- **Test** ↔ **Task** (Test contains many tasks)
- **Topic** ↔ **Task** (Topic contains many tasks)
- **TopicGroup** ↔ **Topic** (Group contains many topics)

## Authentication

The application uses NextAuth.js with Prisma for session management. Authentication flow:
- Credentials-based login (username/password)
- Password hashing with bcrypt
- Session-based authentication
- Protected API routes and pages

## Contributing

When contributing to this project:
1. Create a new branch for your feature
2. Follow the existing code structure and naming conventions
3. Ensure TypeScript types are properly defined
4. Test your changes before submitting

## Deployment

The application is containerized and can be deployed to any platform supporting Docker (AWS, Azure, Google Cloud, etc.).

For production deployments:
1. Set appropriate environment variables
2. Ensure MongoDB Atlas or similar managed database
3. Configure NextAuth secrets properly
4. Build Docker image: `docker build -f Dockerfile -t biotest:latest .`
5. Push to your container registry and deploy

## Support

For issues or questions, please create an issue in the repository.
