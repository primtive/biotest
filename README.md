# BioTest - Biology Learning & Testing Platform

A modern web application for biology education, enabling students to take tests on various biology topics, track their progress, and compete on leaderboards. Built with Next.js, Prisma, and MongoDB.

## Demo Access

For testing purposes, a demo account is available:

- **URL:** [orenbio.ru](https://orenbio.ru)
- **Username:** `demo`

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

## Installation

### Prerequisites
- Node.js 18+ (with pnpm package manager)
- MongoDB instance or MongoDB Atlas connection string
- Docker & Docker Compose (optional, for containerized setup)

### Development Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/primtive/biotest
cd biotest
```

2. **Install dependencies**
```bash
npm i
```

3. **Setup database**
```bash
npx prisma generate
```

4. **Build the app**
```bash
npm run build
```

5. **Start development server with Docker**
```bash
docker compose -f docker-compose-dev.yml up -d
```

Visit `http://localhost` to access the application.

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

## Authentication

The application uses NextAuth.js with Prisma for session management. Authentication flow:
- Credentials-based login (username/password)
- Password hashing with bcrypt
- Session-based authentication
- Protected API routes and pages

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
