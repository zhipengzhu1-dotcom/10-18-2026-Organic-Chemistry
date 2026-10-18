import {Composition, useCurrentFrame, useVideoConfig} from 'remotion';
import {StarForge, STAR_FORGE_SECONDS, type Aspect} from './StarForge';

const FPS = 30;

// Thin Remotion wrapper: the Scene itself only ever sees seconds + aspect.
const StarForgeVideo: React.FC<{aspect: Aspect}> = ({aspect}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <StarForge t={frame / fps} aspect={aspect} />;
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="StarForge9x16"
      component={StarForgeVideo}
      durationInFrames={Math.round(STAR_FORGE_SECONDS * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{aspect: '9:16' as Aspect}}
    />
    <Composition
      id="StarForge16x9"
      component={StarForgeVideo}
      durationInFrames={Math.round(STAR_FORGE_SECONDS * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{aspect: '16:9' as Aspect}}
    />
  </>
);
