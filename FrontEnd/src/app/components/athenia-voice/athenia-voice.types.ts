export interface AtheniaVoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  response: string;
}

export interface PopupMessage {
  type: 'UPDATE_STATE' | 'TOGGLE_LISTENING' | 'STOP_SPEAKING' | 'CLEAR';
  isListening?: boolean;
  isSpeaking?: boolean;
  transcript?: string;
  response?: string;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error:
    | 'no-speech'
    | 'aborted'
    | 'audio-capture'
    | 'network'
    | 'not-allowed'
    | 'service-not-allowed'
    | 'bad-grammar'
    | 'language-not-supported';
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}


