import React, { useState } from 'react';
import { ProcessVideoResponse, ProcessClipResult } from '../types';
import { formatBytes } from '../utils/timeValidator';
import { ClipPreviewPlayer } from './ClipPreviewPlayer';
import { getClipDownloadUrl, openLocalFolderApi } from '../services/api';

interface DownloadResultProps {
  result: ProcessVideoResponse;
  outputFolder?: string;
  onReset: () => void;
}

export const DownloadResult: React.FC<DownloadResultProps> = ({
  result,
  outputFolder,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<'mp4' | 'zip'>('mp4');
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
  const [isOpenFolderLoading, setIsOpenFolderLoading] = useState<boolean>(false);

  // Tải 1 file MP4 trực tiếp
  const handleDownloadSingleMp4 = (clip: ProcessClipResult, index: number) => {
    setDownloadingIndex(index);
    const downloadUrl = getClipDownloadUrl(result.jobId, clip.filename);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = clip.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingIndex(null);
    }, 1200);
  };

  // Tải toàn bộ các file MP4 lần lượt (không cần nén ZIP)
  const handleDownloadAllMp4s = async () => {
    if (!result.clips || result.clips.length === 0) return;

    setIsBatchDownloading(true);
    for (let i = 0; i < result.clips.length; i++) {
      const clip = result.clips[i];
      const downloadUrl = getClipDownloadUrl(result.jobId, clip.filename);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = clip.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Chờ 500ms giữa mỗi file để trình duyệt không chặn tải nhiều file
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setIsBatchDownloading(false);
  };

  // Tải file nén ZIP
  const handleDownloadZip = () => {
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = result.zipFilename || 'result.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mở thư mục trên máy tính
  const handleOpenLocalFolder = async () => {
    setIsOpenFolderLoading(true);
    try {
      await openLocalFolderApi(result.localSavedPath || outputFolder || undefined);
    } catch {}
    finally {
      setIsOpenFolderLoading(false);
    }
  };

  return (
    <div className="card shadow-lg border-success mb-4 bg-dark-subtle">
      {/* Header Banner */}
      <div className="card-header bg-success text-white py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-check2-circle fs-4"></i>
          <h5 className="mb-0 fw-bold">Các Đoạn Video Đã Sẵn Sàng Để Xem &amp; Xuất File</h5>
        </div>
        <span className="badge bg-white text-success px-3 py-1 rounded-pill fw-bold">
          Đã xử lý {result.totalSegments} đoạn video 720p HD
        </span>
      </div>

      <div className="card-body p-4">
        {/* Video Overview Info */}
        <div className="mb-4 bg-body-tertiary p-3 rounded-3 border border-secondary-subtle">
          <label className="text-secondary small fw-semibold">Video YouTube đã xử lý:</label>
          <h5 className="fw-bold text-white mb-2">{result.videoTitle || 'Video YouTube'}</h5>
          <div className="d-flex flex-wrap gap-2 text-secondary small">
            <span className="badge bg-dark border border-secondary-subtle">
              <i className="bi bi-collection-play me-1 text-primary"></i> {result.totalSegments} đoạn video MP4
            </span>
            <span className="badge bg-dark border border-secondary-subtle text-info">
              <i className="bi bi-badge-hd me-1"></i> Chuẩn xuất: 720p H.264 / AAC
            </span>
            {result.zipSizeBytes && (
              <span className="badge bg-dark border border-secondary-subtle">
                <i className="bi bi-file-earmark-zip me-1 text-warning"></i> Dung lượng file nén: {formatBytes(result.zipSizeBytes)}
              </span>
            )}
          </div>
        </div>

        {/* Local Folder Saved Notification */}
        {result.localSavedPath && (
          <div className="alert alert-success py-3 px-4 mb-4 border border-success d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-folder-check fs-2 text-success flex-shrink-0"></i>
              <div>
                <strong className="text-white d-block">
                  Đã tự động lưu video vào thư mục máy tính (Google Drive Sync):
                </strong>
                <code className="text-white font-monospace small">{result.localSavedPath}</code>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-success d-flex align-items-center gap-2 fw-bold shadow-sm"
              onClick={handleOpenLocalFolder}
              disabled={isOpenFolderLoading}
            >
              {isOpenFolderLoading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="bi bi-folder2-open"></i>
              )}
              <span>Mở thư mục trên máy tính</span>
            </button>
          </div>
        )}

        {/* 1. Preview Clips Section */}
        <ClipPreviewPlayer clips={result.clips} jobId={result.jobId} />

        {/* 2. Export Destination Choices (Direct MP4 vs ZIP) */}
        <div className="card border-primary-subtle bg-dark-subtle mb-4 shadow">
          <div className="card-header bg-dark border-secondary-subtle py-2 px-3">
            <ul className="nav nav-pills card-header-pills">
              {/* Tab 1: Direct MP4 (No ZIP) */}
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold d-flex align-items-center gap-2 ${
                    activeTab === 'mp4' ? 'active bg-primary text-white shadow-sm' : 'text-light'
                  }`}
                  onClick={() => setActiveTab('mp4')}
                >
                  <i className="bi bi-film"></i>
                  <span>Lựa chọn 1: Xuất từng file video MP4 (Không cần ZIP) ⭐</span>
                </button>
              </li>

              {/* Tab 2: ZIP */}
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold d-flex align-items-center gap-2 ${
                    activeTab === 'zip' ? 'active bg-primary text-white shadow-sm' : 'text-light'
                  }`}
                  onClick={() => setActiveTab('zip')}
                >
                  <i className="bi bi-file-earmark-zip-fill"></i>
                  <span>Lựa chọn 2: Xuất toàn bộ file nén ZIP</span>
                </button>
              </li>
            </ul>
          </div>

          <div className="card-body p-4">
            {activeTab === 'mp4' ? (
              /* Option 1: Direct MP4 Download (No ZIP) */
              <div>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                  <div>
                    <h5 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
                      <i className="bi bi-file-earmark-play-fill text-primary fs-4"></i>
                      <span>Tải trực tiếp các video MP4 về máy</span>
                    </h5>
                    <p className="text-secondary small mb-0">
                      Tải ngay các file MP4 chất lượng 720p HD về máy mà <strong>không cần phải giải nén file ZIP</strong>.
                    </p>
                  </div>

                  {result.clips.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-lg d-flex align-items-center gap-2 shadow fw-bold"
                      onClick={handleDownloadAllMp4s}
                      disabled={isBatchDownloading}
                    >
                      {isBatchDownloading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          <span>Đang tải {result.clips.length} file MP4...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-download fs-5"></i>
                          <span>Tải Toàn Bộ {result.clips.length} Video MP4</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Grid of MP4 Clips with 1-Click Download Buttons */}
                <div className="row g-3">
                  {result.clips.map((clip, index) => {
                    const isCurrentDownloading = downloadingIndex === index;
                    return (
                      <div key={clip.filename} className="col-12 col-md-6">
                        <div className="card bg-body-tertiary border-secondary-subtle h-100 shadow-sm">
                          <div className="card-body p-3 d-flex flex-column justify-content-between">
                            <div>
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="badge bg-primary px-2 py-1 font-monospace">
                                  #{index + 1}
                                </span>
                                <span className="badge bg-dark-subtle text-white font-monospace">
                                  {clip.durationSeconds}s &bull; {formatBytes(clip.sizeBytes)}
                                </span>
                              </div>

                              <h6
                                className="fw-bold text-white mb-2 font-monospace small"
                                style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                title={clip.filename}
                              >
                                🎬 {clip.filename}
                              </h6>
                            </div>

                            <div className="mt-3">
                              <button
                                type="button"
                                className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 fw-bold shadow-sm"
                                onClick={() => handleDownloadSingleMp4(clip, index)}
                                disabled={isCurrentDownloading}
                              >
                                {isCurrentDownloading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                    <span>Đang bắt đầu tải...</span>
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-download"></i>
                                    <span>Tải File MP4 ({formatBytes(clip.sizeBytes)})</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Option 2: Direct ZIP Download */
              <div className="text-center py-4">
                <div className="mb-4">
                  <i className="bi bi-file-earmark-zip-fill text-primary" style={{ fontSize: '3.5rem' }}></i>
                  <h5 className="fw-bold text-white mt-2 mb-1">
                    Tải về tệp nén: {result.zipFilename || 'result.zip'}
                  </h5>
                  <p className="text-secondary small">
                    Gộp tất cả {result.totalSegments} đoạn video MP4 vào 1 file nén duy nhất. Tổng dung lượng:{' '}
                    <strong>{formatBytes(result.zipSizeBytes)}</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-lg px-5 py-3 d-inline-flex align-items-center gap-2 shadow"
                  onClick={handleDownloadZip}
                >
                  <i className="bi bi-download fs-4"></i>
                  <span className="fw-bold">Tải Trọn Bộ File Nén ZIP Ngay</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reset / New Video Button */}
        <div className="text-center pt-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={onReset}
          >
            <i className="bi bi-arrow-repeat"></i>
            <span>Tiếp tục xử lý video YouTube khác</span>
          </button>
        </div>
      </div>
    </div>
  );
};
