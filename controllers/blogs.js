const jwt = require("jsonwebtoken");
const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");


blogsRouter.get("/", async (request, response) => {
    const blogs = await Blog.find({}).populate("user", { name: 1, username: 1 });
    response.json(blogs);
});

blogsRouter.post("/", async (request, response, next) => {
    const body = request.body;
    const decodedToken = jwt.verify(request.token, process.env.SECRET);
    if (!decodedToken.id) {
        return response.status(401).json({ error: "token invalid" });
    }
    const user = request.user;

    const blog = new Blog({
        title: body.title,
        author: body.author,
        url: body.url,
        likes: body.likes || 0,
        user: user._id
    });

    const savedBlog = await blog.save();
    user.blogs = user.blogs.concat(savedBlog._id);
    await user.save();
    response.status(201).json(savedBlog);
});

blogsRouter.delete("/:id", async (request, response) => {
    const decodedToken = jwt.verify(request.token, process.env.SECRET);
    if (!decodedToken.id) {
        return response.stats(401).json({ error: "token invalid" });
    }
    const user = request.user;
    const blog = await Blog.findById(request.params.id);
    if (blog.user.toString() === user.id.toString()) {
        await Blog.findByIdAndRemove(blog.id);
        return response.status(204).end();
    } else {
        return response.status(403).json({ error: "This is not your blog" });
    }
});

blogsRouter.put("/:id", async (request, response) => {
    const body = request.body;

    const updatedBlog = await Blog.findByIdAndUpdate(
        request.params.id,
        { title: body.title, author: body.author, url: body.url, likes: body.likes },
        { new: true, runValidators: true, context: "query" }
    );

    response.json(updatedBlog);
});

module.exports = blogsRouter;