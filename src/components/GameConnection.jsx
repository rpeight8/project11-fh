import { useState, useCallback } from 'react';

export const GameConnection = () => {
  const [ws, setWs] = useState(null);
  const [wsInstance, setWsInstance] = useState(null);
  const [gameState, setGameState] = useState('idle');
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [question, setQuestion] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [gameStatus, setGameStatus] = useState({
    error: null,
    correctAnswer: null,
    resultsComputed: false,
  });
  const [zoomedImage, setZoomedImage] = useState(null);

  const handleServerMessage = useCallback((data) => {
    switch (data.type) {
      case 'GAME_STATE_UPDATE':
        console.log('GAME_STATE_UPDATE', data);
        setGameStatus({
          error: data.payload.game.error,
          correctAnswer: data.payload.game.correctAnswer,
          resultsComputed: data.payload.game.resultsComputed,
        });
        setQuestion(data.payload.currentQuestion?.text || null);
        if (data.payload.currentQuestion?.imageUrl) {
          setQuestion({
            text: data.payload.currentQuestion.text,
            imageUrl: data.payload.currentQuestion.imageUrl,
          });
        } else {
          setQuestion(data.payload.currentQuestion?.text || null);
        }
        setPlayers(data.payload.players);
        setAnswers(data.payload.currentQuestion?.answers || []);
        setCorrectAnswer(data.payload.game.correctAnswer);
        break;
      default:
        console.log('Unhandled message type:', data.type);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsInstance) {
      wsInstance.close();
      setWsInstance(null);
    }

    setGameState('connecting');

    // const socket = new WebSocket('ws://localhost:1337/');
    const socket = new WebSocket('ws://89.110.123.46:1337/');

    socket.onopen = () => {
      console.log('Connected to server');
      setWs(socket);
      setWsInstance(socket);
      setGameState('waiting');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    };

    socket.onclose = () => {
      console.log('Connection closed');
      setWs(null);
      setGameState('error');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return socket;
  }, [wsInstance, handleServerMessage]);

  const handleStartGame = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'START_GAME' }));
    }
  };

  const handleComputeResults = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'COMPUTE_RESULTS' }));
    }
  };

  const handleNextQuestion = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'NEXT_QUESTION' }));
    }
  };

  const handleFinishGame = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'FINISH_GAME' }));
    }
  };

  const handleImageClick = (imageUrl) => {
    setZoomedImage(imageUrl);
  };

  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

  return (
    <div className="game-connection">
      {/* Preload emojis */}
      <div className="emoji-preload">🎯⏭️</div>
      {!question ? (
        // Setup/Waiting Screen
        <>
          <div className="connection-status">
            <p>Status: {gameState}</p>
            {gameState === 'error' && (
              <div className="error-message">
                <p>Oops! Something went wrong 😅</p>
                <p>Please reload the app to try again</p>
              </div>
            )}
          </div>

          {gameState === 'idle' && (
            <button onClick={connectWebSocket} className="connect-button">
              Start Host Server
            </button>
          )}

          {gameState === 'waiting' && (
            <div className="game-setup">
              <div className="status-panel">
                <div className="status-item">
                  <span className="status-label">Server Status:</span>
                  <span className="status-value connected">Connected</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Players Connected:</span>
                  <span className="status-value">{players.length}</span>
                </div>
              </div>

              {players.length > 0 && (
                <div className="players-list">
                  <h3>Connected Players:</h3>
                  <div className="players-grid">
                    {players.map((player) => (
                      <div
                        key={player.name}
                        className="player-circle"
                        style={{
                          backgroundColor: player.color,
                          border: '2px solid rgba(0, 0, 0, 0.1)',
                        }}
                        title={`${player.name} (Score: ${player.score})`}
                      >
                        {player.name.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleStartGame} className="start-game-button">
                Start Quiz
              </button>
            </div>
          )}
        </>
      ) : (
        // Question Display Screen
        <div className="question-display">
          <div className="question-card">
            {/* Update how the question is displayed */}
            {typeof question === 'object' ? (
              <>
                {question.imageUrl && (
                  <div className="question-image-container">
                    <img
                      src={question.imageUrl}
                      alt="Question visual"
                      className="question-image"
                      onClick={() => handleImageClick(question.imageUrl)}
                      style={{ cursor: 'zoom-in' }}
                    />
                  </div>
                )}
                <h3 className="question-text">{question.text}</h3>
              </>
            ) : (
              <h3 className="question-text">{question}</h3>
            )}
            <div className="answers-grid">
              {answers.map((answer) => (
                <div
                  key={answer.id}
                  className={`answer-card ${
                    gameStatus.correctAnswer === answer.id ? 'correct-answer' : ''
                  }`}
                >
                  <span className="answer-text">{answer.text}</span>
                  <div className="answer-players">
                    {players
                      .filter((player) => player.answer === answer.id)
                      .map((player) => (
                        <div
                          key={player.name}
                          className="player-circle player-answer"
                          style={{
                            backgroundColor: player.color,
                            border: '2px solid rgba(0, 0, 0, 0.1)',
                          }}
                          title={`${player.name} (Score: ${player.score})`}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="action-buttons">
              {!correctAnswer && (
                <button onClick={handleComputeResults} className="compute-results-button">
                  🎯 Reveal Answer
                </button>
              )}
              {correctAnswer && (
                <button onClick={handleNextQuestion} className="next-question-button">
                  ⏭️ Next One!
                </button>
              )}
              <button onClick={handleFinishGame} className="finish-game-button">
                Press if things go wrong!
              </button>
            </div>
          </div>
        </div>
      )}
      {zoomedImage && (
        <div className="image-zoom-overlay" onClick={handleCloseZoom}>
          <img src={zoomedImage} alt="Zoomed question visual" className="zoomed-image" />
        </div>
      )}
    </div>
  );
};
