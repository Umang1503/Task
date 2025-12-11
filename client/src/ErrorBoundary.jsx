import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error, info){
    this.setState({ error, info });
    console.error('ErrorBoundary caught', error, info);
  }

  render(){
    if(this.state.error){
      return (
        <div className="p-4 bg-red-50 text-red-800">
          <h3 className="font-bold">Something went wrong</h3>
          <div>{this.state.error && this.state.error.toString()}</div>
          <details style={{ whiteSpace: 'pre-wrap' }}>{this.state.info && this.state.info.componentStack}</details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
