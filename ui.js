'use strict';
$(async function() {
	// cache some selectors we'll be using quite a bit
	const $body = $('body');
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form');
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $userStories = $('#user-articles');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $addStoryForm = $('#add-story-submit-btn');
	const $favoritedStories = $('#favorited-articles');
	const $navFavorites = $('#nav-favorites');
	const $navUserStories = $('#nav-user-stories');

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

	$loginForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

	$createAccountForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();
		console.log(name, username, password);

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Log Out Functionality
   */

	$navLogOut.on('click', function() {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
   * Event listener for Clicking Login
   */

	$navLogin.on('click', function() {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	/**
	 * Event listener for submitting a new story to API
	 * 
	 * ##todo add in error handling for when not logged in or improper form entry
	 */

	$addStoryForm.on('click', async function(evt) {
		// get values from new story form and provide to StoryList method addStory
		evt.preventDefault();
		const newStory = {
			author : $('#add-story-author').val(),
			title  : $('#add-story-title').val(),
			url    : $('#add-story-url').val()
		};

		//call the addStory method, which calls the API with new story information and recieves and returns a formated new story to be appended to DOM
		await StoryList.addStory(currentUser.loginToken, newStory);
		location.reload();
	});

	/**
   * Event listener for Navigation to Homepage
   */

	$('body').on('click', '#nav-all', async function() {
		hideElements();
		await generateStories();
		$allStoriesList.removeClass('hidden');
	});

	/**
	 * Event listener for favoriting and unfavoriting a story
	 */

	$body.on('click', '.fa-star', async function(evt) {
		// get the story favorite star
		const $favStar = $(evt.target);
		const parentContainer = $favStar.parent().parent().attr('id');
		const fullStar = 'fas';
		const emptyStar = 'far';
		const favoritesContainer = 'favorited-articles';

		// get the story id associated with the story favorite star clicked
		const storyId = $favStar.closest('li').attr('id');

		// Calls helper function to toggle star style and update User favorites
		await _handleFavClick();

		// update user to have new favorited list, so that change to articles container does not show old favorites before refresh
		currentUser = await User.getLoggedInUser(currentUser.loginToken, currentUser.username);

		async function _handleFavClick() {
			//check if star is filled (favorited), and if true remove from current user favorite list
			if ($favStar.hasClass(`${fullStar}`)) {
				await User.removeFavorite(currentUser, storyId);
			}
			else {
				//else star is empty (not favorited), and will be added to current user favorite list
				await User.addFavorite(currentUser, storyId);
			}
			// toggle star style and start spin animation
			$favStar.toggleClass(`${emptyStar} ${fullStar} spin`);
			// end spin animation and if in favorite articles, remove article from list
			setTimeout(() => {
				$favStar.removeClass('spin');
				if (parentContainer === `${favoritesContainer}`) {
					$favStar.closest('li').remove();
				}
			}, 1000);
		}
	});

	$userStories.on('click', '.fa-trash', async function(evt) {
		const storyId = $(evt.target).closest('li').attr('id');
		console.log(storyId);
		await StoryList.deleteStory(currentUser.loginToken, storyId);
		// update user to have new stories list, so that change to articles container does not show deleted stories before refresh
		currentUser = await User.getLoggedInUser(currentUser.loginToken, currentUser.username);
		//remove story from own stories list
		$(evt.target).closest('li').remove();
	});

	/**
	 * Event listener for showing favorited stories list and hiding hiding all stories list
	 */

	$navFavorites.on('click', async function() {
		if (!currentUser) return; //## Add message about logging in

		hideElements();
		await generateFavorites();
	});

	/**
	 * Event listener for showing user's published stories list and hiding all stories list
	 */
	$navUserStories.on('click', async function() {
		if (!currentUser) return; //## Add message about logging in

		hideElements();
		await generateUserStories();
	});

	/**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
	}

	/**
   * A rendering function to run to reset the forms and hide the login info
   */

	async function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.addClass('hidden');
		$createAccountForm.addClass('hidden');

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		await generateStories();
		$allStoriesList.removeClass('hidden');

		// update the navigation bar
		showNavForLoggedInUser();
	}

	/**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	/**
   * A function to render HTML for an individual Story instance
   */

	function generateStoryHTML(story, isOwnStoriesPage) {
		let hostName = getHostName(story.url);
		//Check if story is favorited by user and change star style to full if true and empty if false
		let favStar = '';
		let trashIcon = '';
		if (currentUser) {
			favStar = isFavorited(story)
				? '<i class="fas fa-star"></i>' //full star
				: '<i class="far fa-star"></i>'; //empty
			trashIcon = isOwnStory(story) && isOwnStoriesPage ? '<i class="fas fa-trash"></i>' : '';
		}

		// render story markup
		const storyMarkup = $(`
	  <li id="${story.storyId}">
		${trashIcon}
		${favStar}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/**
	 * Helper function to check if a given story is present on current users's favorited stories.
	 * 
	 * Takes a story and returns true if it is on the current user's favorites, and false if not.
	 */

	function isFavorited(story) {
		for (let favStory of currentUser.favorites) {
			if (story.storyId === favStory.storyId) return true;
		}
		return false;
	}
	function isOwnStory(story) {
		if (!currentUser) return;
		for (let ownStory of currentUser.ownStories) {
			if (story.storyId === ownStory.storyId) return true;
		}
		return false;
	}

	/**
	 * Generates a list of stories based on users's favorited stories.
	 * 
	 * Called when navigating to favorites tab of site. Empties the favorited articles container, grabs users favorites, and calls generateStoryHTML on them.
	 */
	async function generateFavorites() {
		$favoritedStories.empty();
		const favoritedStories = currentUser.favorites;

		// loop through all of our favorited stories and generate HTML for them
		for (let story of favoritedStories) {
			const favStoryHtml = generateStoryHTML(story);
			$favoritedStories.append(favStoryHtml);
		}

		$favoritedStories.removeClass('hidden');
	}

	/**
	 * Generates a list of stories based on users's published stories.
	 * 
	 * Called when navigating to My Stories tab of site. Empties the user articles container, grabs users own stories, and calls generateStoryHTML on them.
	 */
	async function generateUserStories() {
		$userStories.empty();
		const userStories = currentUser.ownStories;

		// loop through all of user posted stories and generate HTML for them
		for (let story of userStories) {
			const userStoryHtml = generateStoryHTML(story, true);
			$userStories.append(userStoryHtml);
		}

		$userStories.removeClass('hidden');
	}

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$userStories,
			$loginForm,
			$createAccountForm,
			$favoritedStories
		];
		elementsArr.forEach(($elem) => $elem.addClass('hidden'));
	}

	function showNavForLoggedInUser() {
		$navLogin.addClass('hidden');
		$navLogOut.removeClass('hidden');
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		}
		else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});
