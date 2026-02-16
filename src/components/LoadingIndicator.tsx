import './LoadingIndicator.css';

export default function LoadingIndicator() {
  return (
    <div className="loading-indicator">
      <div className="loading-spinner">
        <span className="loading-spinner__line" />
        <span className="loading-spinner__line" />
        <span className="loading-spinner__line" />
        <span className="loading-spinner__line" />
        <span className="loading-spinner__line" />
        <span className="loading-spinner__line" />
        <span className="loading-spinner__line" />
        <span className="loading-spinner__line" />
      </div>
    </div>
  );
}
