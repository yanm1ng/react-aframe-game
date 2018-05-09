import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import debounce from 'throttle-debounce/debounce';
import './polyfill';
import CameraError from './CameraError';
import CaptureButton from './CaptureButton';
import CameraWrapper from './CameraWrapper';
import CameraControls from './CameraControls';
import SwitchModeButton from './SwitchModeButton';
import { errorTypes } from './errorTypes';
import { facingModes } from './facingModeTypes';
import { buildConstraints, getAvailableDevices } from './cameraUtils';

class Camera extends PureComponent {
  constructor(props) {
    super(props);
    const {
      facingMode,
      width,
      height
    } = this.props;
    const constraints = buildConstraints(facingMode, width, height);
    const supportsIntersectionObserver = window.IntersectionObserver;

    this.state = {
      constraints,
      devices: null,
      error: false,
      isIntersecting: false,
      mediaStream: null,
    };
    this.changeFacingMode = this.changeFacingMode.bind(this);

    if (supportsIntersectionObserver) {
      this.io = new IntersectionObserver(this.handleIntersectionObserver);
    }
  }

  async componentWillMount() {
    const devices = await getAvailableDevices('video');
    if (devices) {
      this.setState({
        devices
      });
    }
  }

  async componentDidMount() {
    const supportsIntersectionObserver = window.IntersectionObserver;
    await this.getMediaStream(this.state.constraints);
    if (!supportsIntersectionObserver) {
      this.setVideoStream();
    }

    window.addEventListener('resize', this.handleResize);

    if (supportsIntersectionObserver && this.video) {
      this.io.observe(this.video);
    }
  }

  async componentDidUpdate(prevProps, prevState) {
    const { isIntersecting } = this.state;
    if (isIntersecting !== prevState.isIntersecting) {
      if (isIntersecting) {
        const {
          facingMode,
          width,
          height
        } = this.state.constraints.video;
        const constraints = buildConstraints(facingMode, width, height);
        await this.getMediaStream(constraints);
        return this.setVideoStream();
      } else {
        return this.stopMediaStream();
      }
    }
  }

  componentWillUnmount() {
    this.stopMediaStream();
    this.io.disconnect();
    window.removeEventListener('resize', this.handleResize);
  }

  captureMediaStream = (event, mediaStream) => {
    const ms = mediaStream || this.state.mediaStream;
    if (!ms) {
      this.setState({ error: errorTypes.NO_STREAM.type });
    }
    const mediaStreamTrack = ms.getVideoTracks()[0];
    const imageCapture = new window.ImageCapture(mediaStreamTrack);
    if (imageCapture) {
      this.takePhoto(imageCapture);
    }
  };

  async changeFacingMode(facingMode = '') {
    if (!facingModes[facingMode]) {
      return this.setState({ error: errorTypes.INVALID_FACING_MODE.type });
    }
    this.stopMediaStream();
    const { width, height } = this.state.constraints.video;
    const constraints = buildConstraints(facingMode, width, height);
    await this.getMediaStream(constraints);
    this.setVideoStream();
  }

  async getMediaStream(constraints = {}) {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints,
      );
      this.setState({ mediaStream });
    } catch (error) {
      console.log(error);
      this.setState({ error: errorTypes.UNSUPPORTED.type });
    }
  }

  handleIntersectionObserver = ([entry]) => {
    if (entry) {
      return this.setState({ isIntersecting: entry.isIntersecting });
    }
  };

  handleResize = debounce(150, async () => {
    const { facingMode, width, height } = this.state.constraints.video;
    await this.getMediaStream(buildConstraints(facingMode, width, height));
    this.setVideoStream();
  });

  async takePhoto(imageCapture) {
    try {
      const { onTakePhoto } = this.props;
      const blob = await imageCapture.takePhoto();
      const capturedImg = URL.createObjectURL(blob);
      if (onTakePhoto) onTakePhoto(capturedImg);
    } catch (e) {
      this.setState({ error: errorTypes.TAKE_PHOTO_FAILURE.type });
    }
  }

  setVideoStream() {
    const { mediaStream } = this.state;
    const { onSuccess } = this.props;
    if (this.video) {
      this.video.src = mediaStream;
      this.video.srcObject = mediaStream;
      this.video.onloadedmetadata = () => this.video.play();
      onSuccess && onSuccess(this.video);
    }
  }

  stopMediaStream() {
    if (this.video && this.video.srcObject) {
      const { onStopMediaStream } = this.props;
      this.video.srcObject.getTracks().forEach(t => t.stop());
      if (onStopMediaStream) {
        onStopMediaStream();
      }
    }
  }

  render() {
    const { captureButtonRenderer } = this.props;
    const { constraints = {}, devices, error } = this.state;
    const multipleDevices = devices && devices.length > 1;
    const { video: { facingMode } } = constraints;

    if (error) {
      return <CameraError errorType={error} />
    } else {
      return (
        <CameraWrapper>
          <video
            autoPlay
            playsInline
            ref={video => (this.video = video)}
          />
          <CameraControls>
            {captureButtonRenderer ? (
              captureButtonRenderer(this.captureMediaStream)
            ) : (
              <CaptureButton onCapture={this.captureMediaStream} />
            )}
          </CameraControls>
          {multipleDevices && (
            <SwitchModeButton
              currentFacingMode={facingMode}
              onSwitch={this.changeFacingMode}
            />
          )}
        </CameraWrapper>
      );
    }
  }
}

Camera.defaultProps = {
  facingMode: facingModes.ENVIRONMENT,
  responsive: true
};

Camera.propTypes = {
  captureButtonRenderer: PropTypes.func,
  facingMode: PropTypes.string,
  height: PropTypes.number,
  onStopMediaStream: PropTypes.func,
  onTakePhoto: PropTypes.func,
  responsive: PropTypes.bool,
  width: PropTypes.number,
  onSuccess: PropTypes.func
};

export default Camera;
