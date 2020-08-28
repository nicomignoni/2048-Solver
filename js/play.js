async function Play(){
    var gameState = JSON.parse(localStorage.getItem('gameState'));
    while (gameState.over === false){
        Agent(gameState);
        await sleep(300);
        gameState = JSON.parse(localStorage.getItem('gameState'));
        if (gameState.won === true) {
            document.getElementsByClassName("keep-playing-button").click()
        }
    }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}