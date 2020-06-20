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
	const $logOutBtn = $('#log-out');
	const $addStoryForm = $('#add-story-form');
	const $favoritedStories = $('#favorited-articles');
	const $navFavorites = $('#nav-favorites');
	const $navUserStories = $('#nav-user-stories');
	const $navSubmit = $('#nav-submit');
	const $profileUsername = $('#profile-username');
	const $profileName = $('#profile-name');
	const $profileAcctDate = $('#profile-account-date');
	const $navProfile = $('#nav-profile');
	const $profileContainer = $('#user-profile');
	const $accountContainer = $('#account-forms-container');
	const $addStoryContainer = $('#add-story-container');
	const $editForm = $('#edit-story-container');
	const $updateUserContainer = $('#update-user-container');
	const $updateUserBtn = $('#update-user-info-btn');
	const $updateUserForm = $('#update-account-form');
	const $credentialsError = $('#credentials-error');
	const $missingError = $('#missing-error');
	const $conflictError = $('#conflict-error');
	const $invalidEditError = $('#invalid-error-edit');
	const $invalidAddError = $('#invalid-error-add');
	const $nameValidationMsg = $('#name-validation-msg');
	const $usernameValidationMsg = $('#username-validation-msg');
	const $passwordValidationMsg = $('#password-validation-msg');

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
		//Check for error in API response and stop login
		if (errorOccurance(userInstance)) {
			return;
		}
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

		//checks if inputs are valid and cancels submission if they are not
		//then displays error message
		if (!validateInputs(name, username, password)) return;

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		//Check for error response from API request and stop account creation process to allow new submission
		if (errorOccurance(newUser)) {
			return;
		}
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Log Out Functionality
   */

	$logOutBtn.on('click', function() {
		// empty out local storage
		localStorage.clear();
		$navSubmit.toggleClass('disabled');
		$navFavorites.toggleClass('disabled');
		$navUserStories.toggleClass('disabled');

		$profileContainer.toggle();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
   * Event listener for Clicking Login
   */

	$navLogin.on('click', function() {
		// Show the Login and Create Account Forms
		$loginForm.show();
		$createAccountForm.show();
		$accountContainer.slideToggle();
	});

	/**
	 * Event listener for submitting a new story to API
	 * 
	 * ##todo add in error handling for when not logged in or improper form entry
	 */

	$addStoryForm.on('submit', async function(evt) {
		// get values from new story form and provide to StoryList method addStory
		evt.preventDefault();
		const newStory = {
			author : $('#add-story-author').val(),
			title  : $('#add-story-title').val(),
			url    : $('#add-story-url').val()
		};

		//call the addStory method, which calls the API with new story information and recieves and returns a formated new story to be appended to DOM
		const response = await StoryList.addStory(currentUser.loginToken, newStory);

		// check for error response from API and notify user
		if (errorOccurance(response)) {
			return;
		}
		location.reload();
	});

	/**
   * Event listener for Navigation to Homepage
   */

	$body.on('click', '#nav-all', async function() {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
	 * Event listner for showing user profile information and settings
	 */

	$body.on('click', '#nav-profile', async function(evt) {
		evt.preventDefault();
		// hideElements();

		$profileContainer.slideToggle();
	});

	/**
	 * Event listener to show update user container/form
	 */
	$updateUserBtn.on('click', function(evt) {
		evt.preventDefault();

		$updateUserContainer.slideToggle();
	});

	/**
	 * Event listener for submitting Account changes
	 */
	$updateUserForm.on('submit', async function(evt) {
		// get values from current user and provide to User.update method
		evt.preventDefault();
		const userUpdate = {
			name     : $('#update-account-name').val(),
			password : $('#update-account-password').val()
		};

		//remove empty edit fields
		for (let key in userUpdate) {
			if (userUpdate[key] === '') {
				delete userUpdate[key];
			}
		}

		//call the User.update method, which calls the API with updated user information and returns a new user object
		currentUser = await User.updateAccount(currentUser, userUpdate);
		location.reload();
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

		//control spin animation and if in favorite articles, remove article from list
		$favStar.addClass('spin');
		setTimeout(() => {
			$favStar.removeClass('spin');
			if (parentContainer === `${favoritesContainer}`) {
				$favStar.closest('li').remove();
			}
		}, 1000);

		// Calls helper function to update User favorites
		await _handleFavClick();

		//toggle star style
		$favStar.toggleClass(`${emptyStar} ${fullStar}`);

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
		}
	});

	/**
	 * Event listener for deleting a posted story. When on My Stories is visible, clicking the trashcan next to the post will delete it.
	 */

	$userStories.on('click', '.fa-trash', async function(evt) {
		const storyId = $(evt.target).closest('li').attr('id');
		await StoryList.deleteStory(currentUser.loginToken, storyId);
		// update user to have new stories list, so that change to articles container does not show deleted stories before refresh
		currentUser = await User.getLoggedInUser(currentUser.loginToken, currentUser.username);
		//remove story from own stories list
		$(evt.target).closest('li').remove();
	});

	/**
	 * Event listener for showing the story edit form
	 */
	$userStories.on('click', '.fa-pencil-alt', function(evt) {
		$(evt.target).closest('li').after($editForm.get(0));
		$editForm.slideToggle();
	});

	/**
	 * Event listener for submitting story edits 
	 */
	$editForm.on('submit', async function(evt) {
		const storyId = $(evt.target).parent().prev().attr('id');
		// get values from edit story form and provide to StoryList method editStory
		evt.preventDefault();
		const storyEdits = {
			author : $('#edit-story-author').val(),
			title  : $('#edit-story-title').val(),
			url    : $('#edit-story-url').val()
		};

		//remove empty edit fields
		for (let key in storyEdits) {
			if (storyEdits[key] === '') {
				delete storyEdits[key];
			}
		}

		//call the editStory method, which calls the API with edit story information and recieves and returns a formated edited story to be appended to DOM
		const response = await StoryList.updateStory(currentUser.loginToken, storyId, storyEdits);
		// check for error response from API
		if (errorOccurance(response)) {
			return;
		}
		location.reload();
	});

	/**
	 * Event listener for showing submit story section to user
	 */
	$navSubmit.on('click', async function() {
		hideElements();
		$addStoryContainer.slideToggle();
	});
	/**
	 * Event listener for showing favorited stories list and hiding hiding all stories list
	 */

	$navFavorites.on('click', async function() {
		hideElements();
		await generateFavorites();
	});

	/**
	 * Event listener for showing user's published stories list and hiding all stories list
	 */
	$navUserStories.on('click', async function() {
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
		$allStoriesList.show();

		if (currentUser) {
			showNavForLoggedInUser();
			getProfileInfo();
		}
	}

	/**
   * A rendering function to run to reset the forms and hide the login info
   */

	async function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		hideElements();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		await generateStories();
		$allStoriesList.show();

		// update the navigation bar

		showNavForLoggedInUser();
		getProfileInfo();
	}

	async function getProfileInfo() {
		$profileName.text(`Name: ${currentUser.name}`);
		$profileUsername.text(`Username: ${currentUser.username}`);
		$profileAcctDate.text(`Account Created: ${currentUser.createdAt}`);
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
		//Check if story was submitted by user and add trash and edit icons in My Stories tab
		let favStar = '';
		let trashIcon = '';
		let editIcon = '';
		if (currentUser) {
			favStar = isFavorited(story)
				? '<i class="fas fa-star"></i>' //full star
				: '<i class="far fa-star"></i>'; //empty
			trashIcon =
				isOwnStory(story) && isOwnStoriesPage
					? '<i class="fas fa-trash" data-toggle="tooltip" data-placement="bottom" title="Delete Story"></i>'
					: '';
			editIcon =
				isOwnStory(story) && isOwnStoriesPage
					? '<i class="fas fa-pencil-alt" data-toggle="tooltip" data-placement="bottom" title="Edit Story"></i>'
					: '';
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
        <small class="article-hostname ${hostName}">(${hostName})</small> ${editIcon}
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

		$favoritedStories.show();
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

		$userStories.show();
	}

	/* hide all elements in elementsArr. Most often used when changing tabs*/

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$userStories,
			$loginForm,
			$createAccountForm,
			$favoritedStories,
			$profileContainer,
			$addStoryContainer,
			$editForm,
			$updateUserContainer,
			$credentialsError,
			$missingError,
			$conflictError,
			$invalidEditError,
			$invalidAddError,
			$accountContainer,
			$nameValidationMsg,
			$usernameValidationMsg,
			$passwordValidationMsg
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navSubmit.toggleClass('disabled');
		$navFavorites.toggleClass('disabled');
		$navUserStories.toggleClass('disabled');

		$navProfile.html(`<i class="fas fa-user-cog fa-lg"></i>`);
		$navProfile.text(`${currentUser.username}'s Profile`);
		$navProfile.append('<i class="fas fa-user-cog fa-lg"></i>');
		$navProfile.show(0, () => $navProfile.css('display', 'flex')); //Issues where default .show() was creating inline element that messed up styling
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

	/**
	 * Basic error handling for API responses.
	 * Attempts to catch errors thrown for invalid requests and alert user
	 * as to what the issue may be, and allow for reentry of info.
	 */

	function errorOccurance(error) {
		if (typeof error === 'undefined') {
			return false;
		}
		const conflictErr = 'Request failed with status code 409';
		const credentialsErr = 'Request failed with status code 401';
		const missingErr = 'Request failed with status code 404';
		const invaldSubmErr = 'Request failed with status code 400';

		if (error.message === conflictErr) {
			_displayError($conflictError);
			return true;
		}
		if (error.message === missingErr) {
			_displayError($missingError);
			return true;
		}
		if (error.message === credentialsErr) {
			_displayError($credentialsError);
			return true;
		}
		if (error.message === invaldSubmErr) {
			_displayError($invalidAddError);
			_displayError($invalidEditError);
			return true;
		}
		return false;

		function _displayError(element) {
			element.show();
			element.get(0).scrollIntoView(false);
		}
	}

	/**
	 * Validates user inputs for account creation based on requirements stated on API.
	 * Shows error message directing user towards what the issue is if input not valid,
	 * otherwise does nothing
	 */
	function validateInputs(name, username, password) {
		//validate based on required inputs for API (string length 1-55,
		//and username only letters and numbers
		let validUsername;
		let validName;
		let validPassword;

		if (!isValidCharacters(username)) {
			$usernameValidationMsg.show();
			validUsername = false;
		}
		if (!isValidLength(password)) {
			$passwordValidationMsg.show();
			validPassword = false;
		}
		if (!isValidLength(name)) {
			$nameValidationMsg.show();
			validName = false;
		}
		if (validName || validPassword || validUsername) return false;
		else return true;
	}

	function isValidCharacters(username) {
		if (isValidLength(username)) {
			const lettersNumbers = /^[0-9a-zA-Z]+$/;
			if (lettersNumbers.test(username)) {
				return true;
			}
			else return false;
		}
		else return false;
	}

	function isValidLength(string) {
		if (string.length > 0 && string.length < 56) {
			return true;
		}
		else return false;
	}
});
