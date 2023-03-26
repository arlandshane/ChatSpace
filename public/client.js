const likeBtns = document.querySelectorAll(".like-btn");
likeBtns.forEach((likeBtn) => {
	const reactCount = likeBtn.parentElement.querySelector(".react-count");
	let likes = 0;
	let liked = false;
	likeBtn.addEventListener("click", () => {
		if (!liked) {
			likes++;
			liked = true;
			likeBtn.classList.add("liked");
		} else {
			likes--;
			liked = false;
			likeBtn.classList.remove("liked");
		}
		if (likes === 0) {
			reactCount.style.display = "none";
		} else {
			reactCount.style.display = "inline-block";
			reactCount.innerText = likes;
		}
	});
});
