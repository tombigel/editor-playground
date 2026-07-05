import type { CSSProperties, ReactNode } from 'react';
import type { MediaNode } from '../model/types';

function getVideoPlaybackProps(video: MediaNode['video'], previewOnly: boolean) {
  if (previewOnly) {
    return {
      controls: false,
      autoPlay: false,
      muted: true,
      loop: false,
      preload: 'metadata' as const,
    };
  }

  return {
    controls: true,
    autoPlay: video?.autoplay === true,
    muted: video?.autoplay === true ? true : video?.muted !== false,
    loop: video?.loop === true,
    preload: video?.preload ?? 'auto',
  };
}

function getVideoStyle(style: CSSProperties | undefined, previewOnly: boolean): CSSProperties | undefined {
  return previewOnly ? { ...style, pointerEvents: 'none' } : style;
}

function getVideoTitle(node: MediaNode) {
  return node.video?.title || node.alt || '';
}

function getVideoTitleTag(node: MediaNode): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  const tag = node.video?.titleTag;
  return tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' ? tag : 'h3';
}

export function renderVideoElement({
  node,
  standalone,
  dataNodeId,
  videoClassName,
  contentStyle,
  mediaFitStyle,
  previewOnly,
  tabIndex,
  onVideoIntrinsicRatio,
}: {
  node: MediaNode;
  standalone: boolean;
  dataNodeId?: string;
  videoClassName?: string;
  contentStyle?: CSSProperties;
  mediaFitStyle: CSSProperties;
  previewOnly: boolean;
  tabIndex?: number;
  onVideoIntrinsicRatio?: (nodeId: string, ratio: number) => void;
}): ReactNode {
  if (!node.src) {
    return null;
  }

  const video = node.video;
  const playbackProps = getVideoPlaybackProps(video, previewOnly);
  const title = getVideoTitle(node);
  const titleId = title ? `sp-video-title-${node.id}` : undefined;
  const descriptionId = video?.description ? `sp-video-description-${node.id}` : undefined;
  const TitleTag = getVideoTitleTag(node);
  const titleHidden = video?.titleHidden !== false;
  const wrapsVideo = !titleHidden || Boolean(descriptionId);
  const videoElementStyle = wrapsVideo
    ? getVideoStyle(Object.keys(mediaFitStyle).length > 0 ? mediaFitStyle : undefined, previewOnly)
    : getVideoStyle(contentStyle, previewOnly);
  const videoElement = (
    <video
      className={wrapsVideo ? 'sp-video-media' : videoClassName}
      data-node-id={standalone && !wrapsVideo ? dataNodeId : undefined}
      poster={video?.poster || undefined}
      {...playbackProps}
      playsInline
      aria-label={titleHidden && title ? title : undefined}
      aria-labelledby={!titleHidden && titleId ? titleId : undefined}
      aria-describedby={descriptionId}
      tabIndex={tabIndex}
      style={videoElementStyle}
      onLoadedMetadata={
        onVideoIntrinsicRatio
          ? (event) => {
              const element = event.currentTarget;
              if (element.videoWidth > 0 && element.videoHeight > 0) {
                onVideoIntrinsicRatio(node.id, element.videoWidth / element.videoHeight);
              }
            }
          : undefined
      }
    >
      <source src={node.src} type="video/mp4" />
      {video?.captions?.src ? (
        <track
          kind="captions"
          src={video.captions.src}
          srcLang={video.captions.srclang || 'en'}
          label={video.captions.label || 'Captions'}
          default={video.captions.default === true}
        />
      ) : null}
      <p>
        Your browser does not support HTML video.
        {video?.transcriptSrc ? (
          <>
            {' '}
            <a href={video.transcriptSrc}>View the transcript.</a>
          </>
        ) : null}
      </p>
    </video>
  );

  if (!wrapsVideo) {
    return videoElement;
  }

  return (
    <div className={videoClassName} data-node-id={standalone ? dataNodeId : undefined} style={contentStyle}>
      {!titleHidden && titleId ? (
        <TitleTag id={titleId} className="sp-video-title">
          {title}
        </TitleTag>
      ) : null}
      {videoElement}
      {descriptionId ? (
        <p id={descriptionId} className="sp-video-description">
          {video?.description}
        </p>
      ) : null}
    </div>
  );
}
