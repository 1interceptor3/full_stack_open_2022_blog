const mongoose = require("mongoose");
const supertest = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app");
const api = supertest(app);
const helper = require("./test_helper");
const Blog = require("../models/blog");
const User = require("../models/user");

let token = "";

beforeEach(async () => {
    await Blog.deleteMany({});
    await Blog.insertMany(helper.initialBlogs);
    await User.deleteMany({});

    const testUser = {
        "username": "testuser",
        "name": "Test User",
        "passwordHash": await bcrypt.hash("test", 10)
    };
    const user = new User(testUser);
    await user.save();

    const response = await api
        .post("/api/login")
        .send({ username: testUser.username, password: "test" });

    token = response.body.token;
});

describe("when there is initially some blogs", () => {
    test("all blogs are returned as json", async () => {
        const response = await api
            .get("/api/blogs")
            .expect(200)
            .expect("Content-Type", /application\/json/);

        expect(response.body).toHaveLength(helper.initialBlogs.length);
    });

    test("the unique identifier property is named id", async () => {
        const blogsInDb = await helper.blogsInDb();
        expect(blogsInDb[0].id).toBeDefined();
    });
});

describe("creating new blogs", () => {

    test("post request creates a new blog in the db", async () => {
        const blogsAtStart = await helper.blogsInDb();
        const newBlog = {
            title: "New blog",
            author: "Me",
            url: "localhost",
            likes: 0
        };

        await api
            .post("/api/blogs")
            .set("Authorization", `Bearer ${token}`)
            .send(newBlog)
            .expect(201)
            .expect("Content-Type", /application\/json/);

        const blogsAtEnd = await helper.blogsInDb();
        expect(blogsAtEnd).toHaveLength(blogsAtStart.length + 1);

        const titles = blogsAtEnd.map(b => b.title);
        expect(titles).toContain("New blog");
    });

    test("if the likes property is missing it will get 0 value", async () => {
        const newBlog = {
            title: "Blog without likes",
            author: "Also Me",
            url: "localhost",
        };

        await api
            .post("/api/blogs")
            .set("Authorization", `Bearer ${token}`)
            .send(newBlog)
            .expect(201)
            .expect("Content-Type", /application\/json/);

        const blogsAtEnd = await helper.blogsInDb();
        const savedNewBlog = blogsAtEnd.find(b => b.title === "Blog without likes");

        expect(savedNewBlog.likes).toBe(0);
    });

    test("returns 400 if title is missing", async () => {
        const blogsAtStart = await helper.blogsInDb();

        const blogWithoutTitle = {
            author: "Me",
            url: "localhost",
            likes: 0
        };

        await api
            .post("/api/blogs")
            .set("Authorization", `Bearer ${token}`)
            .send(blogWithoutTitle)
            .expect(400);

        const blogsAtEnd = await helper.blogsInDb();

        expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    });

    test("returns 400 if url is missing", async () => {
        const blogsAtStart = await helper.blogsInDb();

        const blogWithoutUrl = {
            title: "Blog without URL",
            author: "Me",
            likes: 0
        };

        await api
            .post("/api/blogs")
            .set("Authorization", `Bearer ${token}`)
            .send(blogWithoutUrl)
            .expect(400);

        const blogsAtEnd = await helper.blogsInDb();

        expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    });

    test("returns 401 if a token is not provided", async () => {
        const blogsAtStart = await helper.blogsInDb();

        const blog = {
            title: "Blog without token",
            author: "Me",
            likes: 0,
            url: "localhost"
        };

        await api
            .post("/api/blogs")
            .send(blog)
            .expect(401);

        const blogsAtEnd = await helper.blogsInDb();
        expect(blogsAtEnd).toEqual(blogsAtStart);
    });
});

describe("deletion of a blog", () => {
    beforeEach(async () => {
        const testBlog = {
            title: "Blog for test",
            author: "Me",
            url: "http://localhost"
        };

        await api
            .post("/api/blogs")
            .set("Authorization", `Bearer ${token}`)
            .send(testBlog);
    });

    test("succeeds with status code 204 if id is valid", async () => {
        const blogsAtStart = await helper.blogsInDb();
        const blogToDelete = blogsAtStart.find(b => b.title === "Blog for test");

        await api
            .delete(`/api/blogs/${blogToDelete.id}`)
            .set("Authorization", `Bearer ${token}`)
            .expect(204);

        const blogsAtEnd = await helper.blogsInDb();

        expect(blogsAtEnd).toHaveLength(blogsAtStart.length - 1);

        const titles = blogsAtEnd.map(r => r.title);

        expect(titles).not.toContain(blogToDelete.title);
    });
});

describe("updating of a blog", () => {
    test("succeeds with status code 200 if id is valid", async () => {
        const blogsAtStart = await helper.blogsInDb();
        const blogToUpdate = blogsAtStart[1];

        const updatedBlog = await api
            .put(`/api/blogs/${blogToUpdate.id}`)
            .send({ ...blogToUpdate, likes: blogToUpdate.likes + 1 })
            .expect(200)
            .expect("Content-Type", /application\/json/);
        
        expect(updatedBlog.body.likes).toBe(blogToUpdate.likes + 1);

        const blogsAtEnd = await helper.blogsInDb();

        expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    });
});

describe("when there is initially one user in db", () => {
    beforeEach(async () => {
        await User.deleteMany({});

        const passwordHash = await bcrypt.hash("sekret", 10);
        const user = new User({ username: "root", name: "root", passwordHash });
        await user.save();
    });

    test("creation succeeds with a fresh username", async () => {
        const usersAtStart = await helper.usersInDb();

        const newUser = {
            username: "ivan",
            name: "Ivan Volkov",
            password: "pass"
        };

        await api
            .post("/api/users")
            .send(newUser)
            .expect(201)
            .expect("Content-Type", /application\/json/);

        const usersAtEnd = await helper.usersInDb();
        expect(usersAtEnd).toHaveLength(usersAtStart.length + 1);

        const usernames = usersAtEnd.map(u => u.username);
        expect(usernames).toContain(newUser.username);
    });

    test("creation fails with proper statuscode and message if username already taken", async () => {
        const usersAtStart = await helper.usersInDb();

        const newUser = {
            username: "root",
            name: "Superuser",
            password: "superpass"
        };

        const result = await api
            .post("/api/users")
            .send(newUser)
            .expect(400)
            .expect("Content-Type", /application\/json/);

        expect(result.body.error).toContain("expected `username` to be unique");

        const usersAtEnd = await helper.usersInDb();
        expect(usersAtEnd).toEqual(usersAtStart);
    });

    test("creation fails with proper statuscode and message if username was not provided", async () => {
        const usersAtStart = await helper.usersInDb();

        const newUser = {
            name: "Me",
            password: "qwerty"
        };

        const result = await api
            .post("/api/users")
            .send(newUser)
            .expect(400)
            .expect("Content-Type", /application\/json/);

        expect(result.body.error).toContain("Path `username` is required");

        const usersAtEnd = await helper.usersInDb();
        expect(usersAtEnd).toEqual(usersAtStart);
    });

    test("creation fails with proper statuscode and message if password was not provided", async () => {
        const usersAtStart = await helper.usersInDb();

        const newUser = {
            username: "anon",
            name: "No one",
        };

        const result = await api
            .post("/api/users")
            .send(newUser)
            .expect(400)
            .expect("Content-Type", /application\/json/);

        expect(result.body.error).toContain("password missing");

        const usersAtEnd = await helper.usersInDb();
        expect(usersAtEnd).toEqual(usersAtStart);
    });

    test("creation fails with proper statuscode and message if username contains less then 3 characters", async () => {
        const usersAtStart = await helper.usersInDb();

        const newUser = {
            username: "me",
            name: "No one",
            password: "qwerty"
        };

        const result = await api
            .post("/api/users")
            .send(newUser)
            .expect(400)
            .expect("Content-Type", /application\/json/);

        expect(result.body.error).toContain("is shorter than the minimum allowed length");

        const usersAtEnd = await helper.usersInDb();
        expect(usersAtEnd).toEqual(usersAtStart);
    });

    test("creation fails with proper statuscode and message if password contains less then 3 characters", async () => {
        const usersAtStart = await helper.usersInDb();

        const newUser = {
            username: "myself",
            name: "No one",
            password: "qw"
        };

        const result = await api
            .post("/api/users")
            .send(newUser)
            .expect(400)
            .expect("Content-Type", /application\/json/);

        expect(result.body.error).toContain("password must be at least 3 characters long");

        const usersAtEnd = await helper.usersInDb();
        expect(usersAtEnd).toEqual(usersAtStart);
    });
});

afterAll(async () => {
    await mongoose.connection.close();
});