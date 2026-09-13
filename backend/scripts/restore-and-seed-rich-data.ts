import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma with pg adapter
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Sample tech content for posts
const techTopics = [
  "Just deployed my first Next.js 14 app with Server Components! The performance is incredible 🚀",
  "Debugging a tricky race condition in my React app. Anyone dealt with useEffect cleanup functions?",
  "TIL: You can use CSS :has() selector for parent selection. Game changer! 🎨",
  "Working on a real-time chat feature with WebSockets. The bi-directional communication is smooth!",
  "Refactored my API to use TypeScript generics. Type safety for the win! 💪",
  "Just learned about database indexing. My queries are now 10x faster ⚡",
  "Struggling with CORS issues. Why is frontend development like this? 😅",
  "Built a custom React hook for form validation. Reusability ftw!",
  "Exploring Prisma ORM. The type safety and migrations are chef's kiss 👨‍🍳",
  "Docker containers are making my local dev setup so much cleaner 🐳",
  "Finally understood closures in JavaScript after 2 years of coding 🤯",
  "CSS Grid vs Flexbox? I use both depending on the layout needs.",
  "Just got my first PR merged into an open source project! 🎉",
  "Testing is not optional. Writing tests for my new feature now.",
  "Authentication with JWT tokens - storing in httpOnly cookies for security 🔐",
  "Optimizing images with Next.js Image component. Lighthouse score = 100!",
  "Error boundaries saved my React app from crashing. Always use them!",
  "Learning PostgreSQL triggers and functions. SQL is powerful!",
  "Code review tip: Be kind, be specific, suggest alternatives 📝",
  "My IDE crashed and I lost 2 hours of work. Always commit early, commit often! 😭",
  "Building a Chrome extension to boost my productivity 🔧",
  "Responsive design without media queries using clamp() and fluid typography",
  "API rate limiting with Redis. Preventing abuse like a pro 🛡️",
  "Monorepo with pnpm workspaces. Sharing code between frontend and backend!",
  "Accessibility matters! Added ARIA labels and keyboard navigation today ♿",
  "Caching strategies: When to use Redis vs in-memory vs CDN?",
  "Git rebase vs merge? I prefer rebase for a cleaner history 🌳",
  "Environment variables management: .env files + validation schemas",
  "Database migrations in production. Scary but necessary! 😰",
  "Code splitting in React with lazy() and Suspense. Faster initial loads!",
  "Writing technical documentation. Future me will thank present me 📚",
  "Pair programming session today. Two brains are better than one! 🧠🧠",
  "Discovered a memory leak in my Node.js app. Time to profile! 🔍",
  "CSS animations with GSAP. Smooth 60fps animations achieved!",
  "RESTful API design principles: resources, HTTP verbs, status codes",
  "GraphQL vs REST? Depends on the use case honestly",
  "Setting up CI/CD pipeline. Automated testing and deployment 🤖",
  "Web performance optimization: lazy loading, code splitting, caching",
  "Learning Rust! The compiler is strict but the safety guarantees are worth it 🦀",
  "Building a CLI tool with Node.js. Terminal apps are fun to make! 💻",
];

const commentTemplates = [
  "Great post! I had a similar experience with {topic}.",
  "This is really helpful, thanks for sharing! 🙏",
  "Have you tried {alternative}? It might help with your issue.",
  "I disagree - I think {opinion}.",
  "Can you share more details about {detail}?",
  "This saved me hours of debugging! Thank you! 🎉",
  "I was stuck on this exact problem last week!",
  "Amazing explanation! Very clear and concise.",
  "Just implemented this in my project. Works perfectly!",
  "What version are you using? This might be version-specific.",
  "Link to the docs would be helpful!",
  "I tried this but got an error: {error}",
  "This is the way! 💯",
  "Hot take but I prefer {alternative} for this use case.",
  "Mind = blown 🤯",
];

async function restoreBackup(backupDir: string) {
  console.log(`📦 Restoring backup from: ${backupDir}`);

  const userBackup = path.join(backupDir, 'user.json');
  if (!fs.existsSync(userBackup)) {
    console.log('⚠️  No user backup found, skipping restore');
    return;
  }

  const users = JSON.parse(fs.readFileSync(userBackup, 'utf-8'));

  for (const user of users) {
    try {
      // Mark all users as verified
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          ...user,
          isVerified: true,
          updatedAt: new Date(user.updatedAt),
        },
        create: {
          ...user,
          isVerified: true,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          lastActive: user.lastActive ? new Date(user.lastActive) : new Date(),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          lastStreakDate: user.lastStreakDate ? new Date(user.lastStreakDate) : null,
        },
      });
      console.log(`✓ Restored user: ${user.username}`);
    } catch (error) {
      console.log(`✗ Failed to restore user ${user.username}:`, error.message);
    }
  }
}

async function createRichData() {
  console.log('🎨 Creating rich data...');

  // Get all users
  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.log('❌ No users found. Please run the main seed first.');
    return;
  }

  console.log(`👥 Found ${users.length} users`);

  // Mark all users as verified
  await prisma.user.updateMany({
    data: { isVerified: true },
  });
  console.log('✓ Marked all users as verified');

  // Create follows between users (everyone follows everyone)
  console.log('🤝 Creating follow relationships...');
  let followCount = 0;
  for (const user of users) {
    for (const otherUser of users) {
      if (user.id !== otherUser.id) {
        try {
          await prisma.follow.create({
            data: {
              followerId: user.id,
              followingId: otherUser.id,
            },
          });
          followCount++;
        } catch (error) {
          // Skip duplicates
        }
      }
    }
  }
  console.log(`✓ Created ${followCount} follow relationships`);

  // Update follower/following counts
  for (const user of users) {
    const followersCount = await prisma.follow.count({
      where: { followingId: user.id },
    });
    const followingCount = await prisma.follow.count({
      where: { followerId: user.id },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { followersCount, followingCount },
    });
  }

  // Create posts for each user (30-40 posts per user)
  console.log('📝 Creating posts...');
  const allPosts = [];

  for (const user of users) {
    const postCount = Math.floor(Math.random() * 11) + 30; // 30-40 posts

    for (let i = 0; i < postCount; i++) {
      const content = techTopics[Math.floor(Math.random() * techTopics.length)];
      const createdDaysAgo = Math.floor(Math.random() * 30); // Posts from last 30 days

      try {
        const post = await prisma.post.create({
          data: {
            authorId: user.id,
            content,
            likesCount: 0,
            commentsCount: 0,
            viewsCount: Math.floor(Math.random() * 100),
            createdAt: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000),
          },
        });
        allPosts.push(post);
      } catch (error) {
        console.log(`✗ Failed to create post for ${user.username}:`, error.message);
      }
    }
    console.log(`✓ Created ${postCount} posts for ${user.username}`);
  }

  console.log(`✓ Created ${allPosts.length} total posts`);

  // Add likes to posts (random engagement)
  console.log('❤️  Adding likes to posts...');
  let likeCount = 0;

  for (const post of allPosts) {
    // Each post gets liked by 0-5 random users
    const numLikes = Math.floor(Math.random() * 6);
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numLikes && i < shuffledUsers.length; i++) {
      const user = shuffledUsers[i];
      if (user.id !== post.authorId) { // Don't like own posts
        try {
          await prisma.like.create({
            data: {
              userId: user.id,
              targetId: post.id,
              targetType: 'POST',
            },
          });
          likeCount++;
        } catch (error) {
          // Skip duplicates
        }
      }
    }
  }

  // Update post like counts
  for (const post of allPosts) {
    const likes = await prisma.like.count({
      where: { targetId: post.id, targetType: 'POST' },
    });
    await prisma.post.update({
      where: { id: post.id },
      data: { likesCount: likes },
    });
  }

  console.log(`✓ Added ${likeCount} likes`);

  // Add comments (including nested replies)
  console.log('💬 Adding comments with nested replies...');
  let commentCount = 0;
  const allComments = [];

  for (const post of allPosts) {
    // Each post gets 0-8 top-level comments
    const numComments = Math.floor(Math.random() * 9);
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numComments && i < shuffledUsers.length; i++) {
      const user = shuffledUsers[i];
      const content = commentTemplates[Math.floor(Math.random() * commentTemplates.length)]
        .replace('{topic}', 'this')
        .replace('{alternative}', 'a different approach')
        .replace('{opinion}', 'there are trade-offs')
        .replace('{detail}', 'your implementation')
        .replace('{error}', 'TypeError');

      try {
        const comment = await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: user.id,
            content,
            likesCount: Math.floor(Math.random() * 5),
          },
        });
        allComments.push(comment);
        commentCount++;

        // 50% chance of having a nested reply
        if (Math.random() > 0.5 && shuffledUsers.length > i + 1) {
          const replyUser = shuffledUsers[i + 1];
          const replyContent = commentTemplates[Math.floor(Math.random() * commentTemplates.length)]
            .replace('{topic}', 'your point')
            .replace('{alternative}', 'what you mentioned')
            .replace('{opinion}', 'you make a good point')
            .replace('{detail}', 'this')
            .replace('{error}', 'the same issue');

          try {
            const reply = await prisma.comment.create({
              data: {
                postId: post.id,
                authorId: replyUser.id,
                content: replyContent,
                parentId: comment.id,
                likesCount: Math.floor(Math.random() * 3),
              },
            });
            allComments.push(reply);
            commentCount++;

            // 25% chance of a second-level nested reply
            if (Math.random() > 0.75 && shuffledUsers.length > i + 2) {
              const nestedReplyUser = shuffledUsers[i + 2];
              try {
                await prisma.comment.create({
                  data: {
                    postId: post.id,
                    authorId: nestedReplyUser.id,
                    content: "This thread is getting interesting! 🍿",
                    parentId: reply.id,
                    likesCount: Math.floor(Math.random() * 2),
                  },
                });
                commentCount++;
              } catch (error) {
                // Skip
              }
            }
          } catch (error) {
            // Skip
          }
        }
      } catch (error) {
        // Skip
      }
    }
  }

  // Update post comment counts
  for (const post of allPosts) {
    const comments = await prisma.comment.count({
      where: { postId: post.id },
    });
    await prisma.post.update({
      where: { id: post.id },
      data: { commentsCount: comments },
    });
  }

  console.log(`✓ Added ${commentCount} comments (including nested replies)`);

  // Add likes to comments
  console.log('👍 Adding likes to comments...');
  let commentLikeCount = 0;

  for (const comment of allComments) {
    const numLikes = Math.floor(Math.random() * 4); // 0-3 likes per comment
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numLikes && i < shuffledUsers.length; i++) {
      try {
        await prisma.like.create({
          data: {
            userId: shuffledUsers[i].id,
            targetId: comment.id,
            targetType: 'COMMENT',
          },
        });
        commentLikeCount++;
      } catch (error) {
        // Skip duplicates
      }
    }
  }

  console.log(`✓ Added ${commentLikeCount} comment likes`);

  // Update user stats
  console.log('📊 Updating user statistics...');
  for (const user of users) {
    const postsCount = await prisma.post.count({
      where: { authorId: user.id },
    });
    const commentsCount = await prisma.comment.count({
      where: { authorId: user.id },
    });
    const likesReceived = await prisma.like.count({
      where: {
        OR: [
          {
            targetId: { in: (await prisma.post.findMany({ where: { authorId: user.id }, select: { id: true } })).map(p => p.id) },
            targetType: 'POST',
          },
          {
            targetId: { in: (await prisma.comment.findMany({ where: { authorId: user.id }, select: { id: true } })).map(c => c.id) },
            targetType: 'COMMENT',
          },
        ],
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        points: user.points + postsCount * 20 + commentsCount * 5 + likesReceived * 2,
      },
    });
  }

  console.log('✅ Rich data creation completed!');
}

async function main() {
  // Find the most recent backup
  const backupsDir = path.join(__dirname, '..', 'backups');
  const backupFolders = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('backup_'))
    .sort()
    .reverse();

  if (backupFolders.length > 0) {
    const latestBackup = path.join(backupsDir, backupFolders[0]);
    await restoreBackup(latestBackup);
  } else {
    console.log('⚠️  No backups found, proceeding with existing data');
  }

  await createRichData();
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
