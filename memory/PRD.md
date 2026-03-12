# Pixelgram - Instagram Clone PRD

## Project Overview
**Application Name**: Pixelgram  
**Type**: Social Media Web Application (Instagram Clone)  
**Created**: January 2026  
**Stack**: FastAPI + MongoDB (Backend), React + Tailwind CSS (Frontend)

## Original Problem Statement
Create an Instagram clone web application based on user's Django backend design with:
- FastAPI + MongoDB backend (chosen for reliability)
- Modern dark aesthetic design
- Cloudinary for image uploads
- Direct Messages feature added

## User Personas
1. **Content Creator**: Shares photos, wants engagement (likes, comments)
2. **Social User**: Follows friends, browses feed, sends DMs
3. **Casual Browser**: Explores content, discovers new users

## Core Requirements (Static)

### Authentication
- [x] User registration with username, email, password
- [x] JWT-based authentication with access/refresh tokens
- [x] Secure password hashing with bcrypt
- [x] Protected routes requiring authentication

### Posts
- [x] Create posts with image upload (Cloudinary)
- [x] View feed of all posts
- [x] Like/Unlike posts with animation
- [x] Comment on posts
- [x] Delete own posts
- [x] View individual post details

### User Profiles
- [x] View user profiles with stats (posts, followers, following)
- [x] Edit profile (bio, avatar)
- [x] Profile avatar upload to Cloudinary
- [x] View user's post grid

### Social Features
- [x] Follow/Unfollow users
- [x] User search functionality
- [x] Explore page with trending posts

### Notifications
- [x] Follow notifications
- [x] Like notifications
- [x] Comment notifications
- [x] Unread count badge

### Direct Messages
- [x] View conversations list
- [x] Send/receive messages
- [x] Real-time message updates (polling)
- [x] Unread message count

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- Complete REST API with 20+ endpoints
- JWT authentication system
- Cloudinary integration for image uploads
- MongoDB collections: users, posts, likes, comments, follows, notifications, messages
- All CRUD operations for posts, comments, follows

### Frontend (React + Tailwind CSS)
- Modern dark theme UI with gradient accents
- Responsive design (Desktop sidebar, Mobile bottom nav)
- All pages: Auth, Home, Explore, Notifications, Messages, Chat, Profile
- Post interactions: Like animation, Comments, Share
- Create Post modal with image upload
- User search with live results

## Architecture

```
/app
├── backend/
│   ├── server.py          # FastAPI app with all routes
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables (MongoDB, JWT, Cloudinary)
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main app with routing
│   │   ├── context/      # AuthContext for state management
│   │   ├── hooks/        # Custom hooks (useCloudinaryUpload)
│   │   ├── pages/        # All page components
│   │   ├── components/   # Reusable components
│   │   └── index.css     # Dark theme CSS variables
│   └── package.json      # Node dependencies
└── design_guidelines.json # UI/UX design specifications
```

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/me

### Users
- GET /api/users/search
- GET /api/users/{user_id}
- GET /api/users/username/{username}
- PUT /api/users/profile
- POST /api/users/{user_id}/follow
- GET /api/users/{user_id}/followers
- GET /api/users/{user_id}/following

### Posts
- GET /api/posts
- POST /api/posts
- GET /api/posts/{post_id}
- DELETE /api/posts/{post_id}
- POST /api/posts/{post_id}/like
- GET /api/posts/{post_id}/comments
- POST /api/posts/{post_id}/comments
- GET /api/users/{user_id}/posts
- GET /api/explore

### Notifications
- GET /api/notifications
- PUT /api/notifications/read
- GET /api/notifications/unread-count

### Messages
- GET /api/conversations
- GET /api/messages/{user_id}
- POST /api/messages/{user_id}
- GET /api/messages/unread-count/total

### Cloudinary
- GET /api/cloudinary/signature

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] User authentication
- [x] Post CRUD operations
- [x] Like/Comment functionality
- [x] User profiles

### P1 (High Priority) - DONE
- [x] Follow system
- [x] Notifications
- [x] Direct messages
- [x] Image uploads

### P2 (Medium Priority) - FUTURE
- [ ] Stories feature
- [ ] Reels/video support
- [ ] Push notifications (WebSockets)
- [ ] Email notifications
- [ ] Password reset

### P3 (Low Priority) - BACKLOG
- [ ] Post scheduling
- [ ] Analytics dashboard
- [ ] Admin panel
- [ ] Report/Block users
- [ ] Hashtag support

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
JWT_SECRET=<secret>
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=<backend_url>
```

## Next Tasks
1. Add Stories feature
2. Implement WebSocket for real-time messaging
3. Add hashtag support with search
4. Implement saved posts/bookmarks
5. Add video upload support
