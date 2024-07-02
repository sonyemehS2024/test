// Checks if the user is logged in
// If yes, render the page
// If no, go back to the login page
fetch("http://localhost:3000/auth", {
    method: 'POST',
    body: JSON.stringify(),
    headers: { 'content-type': 'application/json' }
})
    .then(response => response.json())
    .then((data) => {

        if (data.message === "success") {
            let socketio = io.connect();
            render(socketio, data.currentUser);
        }

        else {
            alert(data.message);
            location.href = "http://localhost:3000";
        }
    })
    .catch(err => console.error('Error:', err));

// This function handles the rendering of the page
function render(socketio, currentUser) {

    // Queries the backend for all the posts to render
    socketio.emit("get_posts_to_server", { currentUser: currentUser });

    socketio.removeAllListeners("get_posts_to_client");
    // Gets all the posts from the server
    socketio.on("get_posts_to_client", function (data) {

        // Contains all the posts from the database
        let posts = data.posts;
       
        // Rendering page
        let postarea = document.getElementById("postarea");
        let postbar = document.getElementById("postbar");

        if (document.getElementById("textarea") !== null) {
            postarea.removeChild(document.getElementById("textarea"));
            document.getElementById("post").removeEventListener("click", function () { post(socketio, currentUser) }, false);
            document.getElementById("logout").removeEventListener("click", function () { logout(socketio, currentUser) }, false);
            postbar.removeChild(document.getElementById("post"));      
        }

        let textarea = document.createElement("textarea");
        textarea.setAttribute("id", "textarea");
        let postButton = document.createElement("button");
        postButton.setAttribute("id", "post");
        let postButtonText = document.createTextNode("Post");
        postButton.appendChild(postButtonText);

        postarea.appendChild(textarea);
        postbar.appendChild(postButton);

        let home = document.getElementById("home");

        let logoutForm = document.createElement("form");
        logoutForm.setAttribute("id", "logout_form");

        home.appendChild(logoutForm);

        let chatlist = document.getElementById("chatlist");

        // Clears all in chatlist
        while (chatlist.firstChild) {
            chatlist.removeChild(chatlist.lastChild);
        }

        // Render all the posts on the page
        for (let i = 0; i < posts.length; i++) {

            let postHeader = document.createElement("div");
            postHeader.setAttribute("class", "postHeader");

            let postUser = document.createElement("p");
            postUser.setAttribute("class", "postUser");

            let postUserText = document.createTextNode(posts[i].user);

            let postTimestamp = document.createElement("p");
            let postTimestampText = document.createTextNode(posts[i]["DATE_FORMAT(timestamp, '%m.%d.%Y %h:%i%p')"]);
            postTimestamp.appendChild(postTimestampText);
            postTimestamp.setAttribute("class", "timestamp");

            // If the post was made by the current userthen show it as "Me"
            if (posts[i].user == currentUser) {
                postUserText = document.createTextNode("Me");
            }

            postUser.appendChild(postUserText);

            // Adds the post to the dom
            let postContent = document.createElement("p");
            postContent.setAttribute("class", "postContent");

            let postContentText = document.createTextNode(posts[i].post);
            postContent.appendChild(postContentText);

            let postDiv = document.createElement("div");
            postDiv.setAttribute("class", "post");

            postHeader.appendChild(postUser);
            postHeader.appendChild(postTimestamp);
            postDiv.appendChild(postHeader);
            postDiv.appendChild(postContent);

            chatlist.appendChild(postDiv);
        }

        // Added to make sure it scrolls to the bottom when posts are rendred
        chatlist.scrollTop = chatlist.scrollHeight;

        document.getElementById("post").addEventListener("click", function () { post(socketio, currentUser) }, false);
        document.getElementById("logout").addEventListener("click", function () { logout(socketio) }, false);
    })
}

// Posts to the chatroom
function post(socketio, currentUser) {
    let post = document.getElementById("textarea").value;
    socketio.emit("post_to_server", { currentUser: currentUser, post: post });
}

// Logs out the current user
function logout(socketio){
    let form = document.getElementById("logout_form");
    form.setAttribute("action", "/logout");
    form.setAttribute("method", "post");
    form.submit();

    socketio.disconnect();
}