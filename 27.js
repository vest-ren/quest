var login_path = "/quest"
var redirect_uri = "https://vest-v2.webflow.io/quest"
var xano_twitter_oauth_init_url = "https://xfrp-jttq-abkf.n7c.xano.io/api:3LEBk3xS/oauth/twitter/request_token"
var xano_twitter_oauth_continue_url = "https://xfrp-jttq-abkf.n7c.xano.io/api:3LEBk3xS/oauth/twitter/access_token"
var discord_url = "https://discord.com/oauth2/authorize?response_type=token&client_id= 1160981538788343988&scope=identify"
var xano_user_url = "https://xfrp-jttq-abkf.n7c.xano.io/api:Mtsyi-X8/user"
var formHeaders = [];
var formResponse = [];
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const EvmChains = window.EvmChains;

// Web3modal instance, Chosen wallet provider given by the dialog window, Address of the selected account
let web3Modal, provider, selectedAccount;
let accounts = [];

//init button handlers
$("#wallet-connect").on("click", connectWallet);
$("#twitter-connect").on("click", initTwitterAuth);
$("#discord-connect").on("click", connectDiscord);


window.onload = function () {
    console.log("testing 22")
    initWalletAuth()
    var wallet = window.localStorage.getItem('wallet');
    var twitter = window.localStorage.getItem('twitter');
    var discord = window.localStorage.getItem('discord');

    var curUrl = new URL(document.location.href);

    // Handling Twitter API
    var twitter_oauth_token = curUrl.searchParams.get("oauth_token");
    var twitter_oauth_verifier = curUrl.searchParams.get("oauth_verifier");
    if (twitter_oauth_verifier && twitter_oauth_token) {
        connectedText('twitter');
        continueTwitterAuth(twitter_oauth_token, twitter_oauth_verifier);
    }

    // Handling Discord API
    var fragmentParams = new URLSearchParams(curUrl.hash.substr(1));
    var discord_access_token = fragmentParams.get("access_token");
    if (discord_access_token) {
        console.log("found access token");
        connectedText('discord');
        continueDiscordAuth(discord_access_token);
    }
    if (discord) {
        connectedText('discord');
    }

    if (twitter) {
        connectedText('twitter');
    }

    if (wallet) {
        //show disconnect button
        disableWalletConnectBtn(wallet.replace(wallet.substring(4, wallet.length - 4), "..."));
    } else {
        disableTwitterBlock()
        disableDiscordBlock()
    }
}

function connectDiscord() {
    window.location.href = discord_url
}

//TWITTER FUNCTIIONS
function initTwitterAuth() {
    let request = new XMLHttpRequest();
    let fetchURL = xano_twitter_oauth_init_url;
    var params = JSON.stringify({ "redirect_uri": redirect_uri });
    request.open('GET', fetchURL, true)
    request.onload = function () {
        let data = JSON.parse(this.response)
        if (request.status >= 200 && request.status < 400) {
            window.location.href = data.authUrl
        } else {
            console.log('wrong ' + request)
        }
    }
    request.send(params)

    // var newUrl = new URL(document.location.href);
    // newUrl.searchParams.delete("code");
    // newUrl.searchParams.delete("scope");
    // history.replaceState(null, "", newUrl.toString());
}
function continueTwitterAuth(oauth_token, oauth_verifier) {
    let request = new XMLHttpRequest();
    let link = xano_twitter_oauth_continue_url + '?oauth_token=' + oauth_token + '&oauth_verifier=' + oauth_verifier
    request.open('GET', link, true)
    request.onload = function () {
        let data = JSON.parse(this.response)
        if (request.status >= 200 && request.status < 400) {
            console.log('Running: Twitter Auth Token ' + data.authToken)
            saveInLocalStorage('twitter', 'true')
            let secondRequest = new XMLHttpRequest();
            secondRequest.open('PATCH', xano_user_url + '/twitter' + formatParams({ "twitter": data.authToken }));
            secondRequest.send();
        }
    }
    request.send()

    var newUrl = new URL(document.location.href);
    newUrl.searchParams.delete("oauth_token");
    newUrl.searchParams.delete("oauth_verifier");
    history.replaceState(null, "", newUrl.toString());

    enableDiscordBlock()
}

function continueDiscordAuth(discord_access_token) {
    console.log("Continuing discord auth")
    //Save in Local Storage
    saveInLocalStorage('discord', 'true')

    let request = new XMLHttpRequest()
    request.open('PATCH', xano_user_url + '/discord' + formatParams({ "discord": data.authToken }));
    request.send(params)

    var newUrl = new URL(document.location.href);
    newUrl.hash = ""; // Clears the fragment part of the URL
    history.replaceState(null, "", newUrl.toString());
}

//WALLET FUNCTIONS
function initWalletAuth() {
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                // Mikko's test key - don't copy as your mileage may vary
                infuraId: "27e484dcd9e3efcfd25a83a78777cdf1",
            }
        },
    };
    web3Modal = new Web3Modal({
        cacheProvider: false, // optional
        providerOptions, // required
    });
}

async function connectWallet() {
    console.log("Opening a dialog", web3Modal);
    try {
        provider = await web3Modal.connect();
    } catch (e) {
        console.log("Could not get a wallet connection", e);
        return;
    }

    const web3 = new Web3(provider);
    const chainId = await web3.eth.getChainId();
    accounts = await web3.eth.getAccounts();
    selectedAccount = accounts[0];
    var cutAcc = selectedAccount.replace(selectedAccount.substring(4, selectedAccount.length - 4), "...");

    saveInLocalStorage('wallet', selectedAccount)
    //contact server to get twitter / discord information
    checkIfUserExists(selectedAccount).then(result => {
        if (result) {
            console.log('User exists:', result);
            if (result.twitter) {
                saveInLocalStorage('twitter', 'true')
                connectedText('twitter')
            }
            if (result.discord) {
                saveInLocalStorage('discord', 'true')
                connectedText('discord')
            }
        } else {
            console.log('User does not exist.');
            createNewAccount(selectedAccount);
        }
    }).catch(error => {
        console.error('Error checking if user exists:', error);
    });

    // let request = new XMLHttpRequest();
    // let params = JSON.stringify({ 'wallet_address': selectedAccount })
    // request.open('POST', 'https://x8ki-letl-twmt.n7.xano.io/api:Mtsyi-X8/user', true)
    // request.send(params)
    enableTwitterBlock()
    disableWalletConnectBtn(cutAcc);
}

async function disconnectWallet() {
    console.log('Disconnecting')
    enableWalletConnectBtn()

    window.localStorage.removeItem("wallet");
    window.localStorage.removeItem("twitter");
    window.localStorage.removeItem("discord");
    removeConnectedText('twitter')
    removeConnectedText('discord')
}

function enableWalletConnectBtn() {
    $("#wallet-connect").off();
    $("#connect-text").text("Connect Wallet");
    $("#wallet-connect").on("click", connectWallet);
    $("#wallet-subtitle").text("Connect your crypto wallet to register for Waitlist and earn points!")
}

function disableWalletConnectBtn(cutAcc) {
    $("#wallet-connect").off();
    $("#connect-text").text(cutAcc);
    $("#wallet-connect").on('mouseenter', () => {
        $("#connect-text").text('Disconnect');
    });
    $("#wallet-connect").on('mouseout', () => {
        $("#connect-text").text(cutAcc);
    });
    $("#wallet-connect").on("click", disconnectWallet);
    $("#wallet-subtitle").text("You're connected! You can now earn points.")
}

function enableTwitterBlock() {
    $('#twitter-block').css("opacity", "1");
    $('#twitter-block').css("cursor", "auto");
    $('#twitter-block').css("pointer-events", "auto");
}

function disableTwitterBlock() {
    $('#twitter-block').css("opacity", "0.5");
    $('#twitter-block').css("cursor", "not-allowed");
    $('#twitter-block').css("pointer-events", "none");
}

function enableDiscordBlock() {
    $('#discord-block').css("opacity", "1");
    $('#discord-block').css("cursor", "auto");
    $('#discord-block').css("pointer-events", "auto");
}

function disableDiscordBlock() {
    $('#discord-block').css("opacity", "0.5");
    $('#discord-block').css("cursor", "not-allowed");
    $('#discord-block').css("pointer-events", "none");
}

function connectedText(id) {
    $(`#${id}-connect`).css("background-color", "transparent")
    $(`#${id}-connect`).css("border-color", "#58F5BD")
    $(`#${id}-connect`).css("border-style", "solid")
    $(`#${id}-connect`).css("pointer-events", "default");
    $(`#${id}-connect`).off("click");


    $(`#${id}-text`).text(`${id.toUpperCase()} Connected`)
    $(`#${id}-text`).css("color", "#58F5BD")
}

function removeConnectedText(id) {
    var color;
    if (id == 'discord') {
        color = '#7289da'
        $(`#${id}-connect`).on("click", connectDiscord);
    }
    if (id == 'twitter') {
        color = '#1da1f2'
        $(`#${id}-connect`).on("click", initTwitterAuth);
    }
    $(`#${id}-connect`).css("background-color", color)
    $(`#${id}-connect`).css("border", "none")
    $(`#${id}-connect`).css("pointer-events", "pointer");


    $(`#${id}-text`).text(`Connect ${id.toUpperCase()}`)
    $(`#${id}-text`).css("color", "white")

}


//utility functions
//save the generated token in the local storage as a cookie
function saveInLocalStorage(name, authToken) {
    window.localStorage.setItem(name, authToken);
}

function formatParams(params) {
    return "?" + Object
        .keys(params)
        .map(function (key) {
            return key + "=" + encodeURIComponent(params[key])
        })
        .join("&")
}

function createNewAccount(wallet_address) {
    console.log("Creating new account")
    let request = new XMLHttpRequest();
    let params = { 'user_wallet_address': wallet_address };
    request.open('POST', xano_user_url + formatParams(params), true);
    request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    request.send();
}

function submitTwitterToken(token) {

}

function checkIfUserExists(wallet_address) {
    return new Promise((resolve, reject) => {
        let request = new XMLHttpRequest();
        let params = { 'user_wallet_address': wallet_address };
        request.open('GET', xano_user_url + '/check_wallet' + formatParams(params), true);

        request.onload = function () {
            if (request.status >= 200 && request.status < 400) {
                let data = JSON.parse(this.response);
                resolve(data);  // If request is successful, resolve the promise with data.
            } else {
                resolve(false);  // If request has error status, resolve the promise with false.
            }
        };

        request.onerror = function () {
            reject(new Error("Network error"));  // If there's a network error, reject the promise.
        };

        request.send();
    });
}
