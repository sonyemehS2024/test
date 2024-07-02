// Diplays error message retrieved from the backend
fetch("http://localhost:3000/error", {
    method: 'POST',
    body: JSON.stringify(),
    headers: { 'content-type': 'application/json' }
})
    .then(response => response.json())
    .then((data) => {
        if(data.message == ""){
            location.href = "http://localhost:3000";
        }
        else{
            alert(data.message);
            location.href = "http://localhost:3000";
        }        
    })
    .catch(err => console.error('Error:', err));
