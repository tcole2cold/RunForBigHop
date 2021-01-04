// Removes the loading screen after all the content is loaded. 
window.addEventListener('load', function () {
    killLoadingScreen();
  })

document.addEventListener('DOMContentLoaded', () => {      

        // Checks if the URL's query string has a Strava authentication code. If it does, it hides the landing page and makes a call to a web server to authenticate. 
        // Then the secondary page with stats on the user's latest run is built. 
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        if(urlParams.has('code')) {
            killLoadingScreen();
            hideLanding();
            console.log('here is my access code ' + urlParams.get('code'))
            //This is a simple API I have set up to handle authentication for a few small side projects. 
            //Replication of this project would require your own OAuth handling for Strava. 
            const authUrl = 'https://shielded-badlands-24071.herokuapp.com/api/activity/' + urlParams.get('code');
            callServerForToken(authUrl);
        }
});
    
    //Grabs references to all the element on the landing page the disappear after authenticating, adds a display-none class to them, then uses a helper method to add it to all their child elements as well. 
    function hideLanding() {
        let videoBox = document.getElementById('video-box');
        let textBar = document.getElementById('text-bar');
        let explainerBox = document.getElementById('explainer-box');
        let buttonBox = document.getElementById('btn-holder');
        let footBox = document.getElementById('foot-holder');
        let equalSign = document.getElementById('equal')
    
        videoBox.classList.add('hidden');
        textBar.classList.add('hidden');
        explainerBox.classList.add('hidden');
        buttonBox.classList.add('hidden');
        footBox.classList.add('hidden');
        equalSign.classList.add('hidden')
        hideChildElements(videoBox)
        hideChildElements(textBar)
        hideChildElements(explainerBox)
        hideChildElements(buttonBox)
        hideChildElements(footBox);
    }
    
    //Here's the helper method that hides an element's child elements. Just uses a basic loop. 
    function hideChildElements(element) {
        let childs = element.children;
        var i;
        for (i = 0; i < childs.length; i++) {
            childs[i].classList.add('hidden');
        }
    }
    
    //Makes a call to the backend to authenticate for Strava. Their name is used to greet the user while a second call retrieves data on their latest Strava activity.  
    function callServerForToken(authUrl) {
        let nameAndToken;
        fetch(authUrl)
        .then((response) =>{
            return response.json();
        })
        .then((data) => {
            nameAndToken = [data.athlete.firstname, data.access_token];
            welcome(data.athlete.firstname);
            getActivities(data.access_token);
        })
        return nameAndToken;
    }
    
    //Draws a greeting for the user using the first name from the Strava account. 
    function welcome(firstname) {
        let loadBox = document.getElementById('load-in-content');
        if(loadBox.classList.contains('hidden')) {
            loadBox.classList.remove("hidden");
        }
        loadBox.innerHTML = "<a href='http://www.runforbighop.com/'><h1 class='orange' id='second-logo'>RUN FOR BIG HOP</h1></a><h1 id='big-greet' class='fade-in'>Hi there, " + firstname + ".</h1><div id='actBox'></div>"
    }
    
    //Accesses the latest activity on their account using the auth token retrieved when the user's first name is retrieved. 
    //This is broken out from the first name retrieval mainly because we need calorie data for the app to work, and we can only get said data by making a call for detailed activity data using said activity's unique ID. 
    function getActivities(token) {
        let myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + token);
        
        let requestOptions = {
          method: 'GET',
          headers: myHeaders,
          redirect: 'follow'
        };
        
        //Note: We're actually getting five activities back here and only using the first one. A future iteration of the app may add additional activities drawn out on the loaded page. 
        fetch("https://www.strava.com/api/v3/athlete/activities?per_page=5", requestOptions)
        .then((response) =>{
            return response.json();
        })
        .then((data) => {
            drawLatestActivity( data[0].id, requestOptions);
        })
    
    }
    
    //Pass in an activity's unique ID, and this grabs all the needed data using another call to Strava. 
    //Data is then passed to another method to build that data into formatted HTML for display. 
    //This method should be able to be reused mostly as-is to build out multiple activities, if that change is implemented in a future update. 
    function drawLatestActivity(activityId, requestOptions) {
        fetch("https://www.strava.com/api/v3/activities/" + activityId, requestOptions)
        .then((response) =>{
            return response.json();
        })
        .then((data) => {

            console.log(data);
            let actBox = document.getElementById('actBox');

            let activityName = data.name;
            let rawDate = data.start_date;
            let date = fixDate(rawDate);
            let count = convertCalsToBeers(data.calories);
            let polyline = data.map.summary_polyline;
            let latestMap = getAMapSrc(polyline);

            actBox.innerHTML = buildActivityBox(latestMap, count, activityName, date);
        })
    }

    //Plugs the data into an HTML template for display to the user. 
    //A check is also performed here to be sure that calorie data exists. 
    //If anything in the series of calls has gone wrong and that calorie info is not available (or if the user simply doesn't have their weight logged on Strava), an alert window pops up with helpful information. 
    function buildActivityBox(latestMap, count, name, date) {
        let boxStr = '<div id="latest-box"><img class="fade-in" id="latest-map" src="' + latestMap + '"><div id="big-hop-info-box" class="fade-in"><div id="count-box">' + '<p id="big-count">' + count + ' <span id="times"> X </span></p>' + '</div><img id="bigHopPic" class="fade-in" src="bighop.png"></div></div>';
        let descriptionStr = '<div class="fade-in" id="descr-box"><h2>' + randomHappyWord() + ' Your activity "' + name + '"  burned about ' + count + ' Big Hops on ' + date + '.</h2>';
        if(count == 0) {
            window.alert('Sorry! Looks like I was unable to pull any beer data for your activity. A couple common things that may cause this: 1) You do not have your bodyweight entered onto your Strava profile. 2) You manually uploaded this activity. Sorry! I will redirect you home now.');
            window.location = 'http://www.runforbighop.com/';
        }
        return boxStr + descriptionStr;
   }

   //Every time a user uses the app, one of these words is used at random to praise their latest activity. 
   function randomHappyWord() {
        let positivityArray = ['Rad!', 'Cool!', 'Wowee zowee!', 'Gnarly!', 'Nice job!', 'Alright!', 'Great work!'];
        return positivityArray[Math.floor(Math.random() * positivityArray.length)];
   }

   //Dates come from Strava looking pretty ugly. This trims some of the mess out of the string. 
   function fixDate(rawDate) {
       let trimmed = rawDate.substring(0,10)
       return trimmed;
   }
    
    //Converts calorie stat from Strava into a rounded off quantity of Big Hops. 
    function convertCalsToBeers(calories) {
        let rawBeers = calories / 174;
        let roundedBeers = Math.round(rawBeers * 10) / 10;
        return roundedBeers;
    }
    
    //Uses the Google Maps API to build an image source. 
    //Note: My Google Maps API Key IS hard-coded in here. However, the key is restricted to exclusively use the free-use static maps API, which allows use with unprotected API keys. The key is also restricted to only allow calls made from this domain. 
    //Replicating this project would require setting up your own API key and enabling similar restrictions. Your key should be substituted into the query string below where the XXXXX is. 
    function getAMapSrc(polyline) {
        const mapSrc =  "https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&path=enc:" + polyline + "&key=XXXXX";
        return mapSrc;
    }

    //Hides the landing page's loading screen. 
    function killLoadingScreen() {
        const loaderWrapper = document.getElementById('loader-wrapper');
        loaderWrapper.classList.add('hidden');
        hideChildElements(loaderWrapper);
        const videoBox = document.getElementById('video-box');
        videoBox.classList.remove('hidden');
    }