// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function() {
  if (typeof window.PokiSDK !== "undefined") {
    PokiSDK.init()
      .then(function() {
        PokiSDK.gameLoadingStart();
        PokiSDK.gameLoadingProgress({ percentageDone: 1 });
        PokiSDK.gameLoadingFinished();

        runApplication();
      })
      .catch(() => {
        runApplication();
      });
  } else {
    runApplication();
  }
});

function runApplication() {
  new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);

  // TODO: This code is in need of a refactor (along with the rest)
  var storage = new LocalStorageManager();
}
