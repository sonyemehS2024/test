function search() {
    let query = document.getElementById('search').value;
    document.getElementById('results').innerHTML = "You searched for: " + query;
}