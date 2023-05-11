const jwt = require("jsonwebtoken");
const blogsRouter = require("express").Router();
const logger = require("../utils/logger");
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
    const fullSavedBlog = await savedBlog.populate("user", { name: 1, username: 1 });
    user.blogs = user.blogs.concat(savedBlog._id);
    await user.save();
    response.status(201).json(fullSavedBlog);
});

blogsRouter.delete("/:id", async (request, response) => {
    const decodedToken = jwt.verify(request.token, process.env.SECRET);
    if (!decodedToken.id) {
        return response.status(401).json({ error: "token invalid" });
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

blogsRouter.post("/:id/comments", async (request, response) => {
    const { comment } = request.body;
    const blog = await Blog.findById(request.params.id).populate("user", { name: 1, username: 1 });

    blog.comments = blog.comments.concat(comment);
    const updatedBlog = await blog.save();

    return response.status(201).json(updatedBlog);
});

blogsRouter.put("/:id", async (request, response) => {
    const body = request.body;

    const updatedBlog = await Blog.findByIdAndUpdate(
        request.params.id,
        { title: body.title, author: body.author, url: body.url, likes: body.likes, user: body.user },
        { new: true, runValidators: true, context: "query" }
    );
    const fullUpdatedBlog = await updatedBlog.populate("user", { username: 1, name: 1 });
    response.status(200).json(fullUpdatedBlog);
});

module.exports = blogsRouter;