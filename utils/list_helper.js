const dummy = blogs => {
    return 1;
};

const totalLikes = blogs => {
    return blogs.reduce((accumulator, blog) => accumulator + blog.likes, 0);
};

const mostBlogs = blogs => {
    let topAuthor = "",
        maxBlogs = 0,
        authors = {};

    for (let i = 0; i < blogs.length; i++) {
        const author = blogs[i].author;
        authors[author] = authors[author] ? authors[author] + 1 : 1;

        if (authors[author] > maxBlogs) {
            topAuthor = author;
            maxBlogs = authors[author];
        }
    }
    return { author: topAuthor, blogs: maxBlogs };
};

const mostLikes = blogs => {
    let mostLikedAuthor = "",
        maxLikes = 0,
        authors = {};

    for (let i = 0; i < blogs.length; i++) {
        const author = blogs[i].author;
        authors[author] = authors[author] ? authors[author] += blogs[i].likes : blogs[i].likes;

        if (authors[author] > maxLikes) {
            mostLikedAuthor = author;
            maxLikes = authors[author];
        }
    }
    return { author: mostLikedAuthor, likes: maxLikes };
};

module.exports = { dummy, totalLikes, mostBlogs, mostLikes };