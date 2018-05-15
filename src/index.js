import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';

import FullWrapper from './components/full-wrapper';
import Pokeball from './components/pokeball';
import Pokemon from './components/pokemon';
import Camera from './components/camera';
import Detector from './components/detector';

import './index.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: 'init', // ['init', 'detect', 'catch', 'battle']
      camera: null
    };
  }

  onCameraSuccess = (camera) => {
    this.setState({
      camera
    });
  }

  onDetect = () => {
    this.setState({
      status: 'catch'
    });
  }

  onCameraControl = () => {
    this.setState({
      status: 'detect'
    });
  }

  render () {
    const { status, camera } = this.state;

    return (
      <FullWrapper>
        <Camera onSuccess={this.onCameraSuccess} onControl={this.onCameraControl} />
        { status === 'detect' &&
          <Detector camera={camera} onDetect={this.onDetect} />
        }
        { status === 'catch' &&
          <Pokeball />
        }
        { status === 'battle' &&
          <Pokemon />
        }
      </FullWrapper>
    );
  }
}

ReactDOM.render(<App/>, document.querySelector('#app'));