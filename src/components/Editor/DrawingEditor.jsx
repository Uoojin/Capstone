import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import stickerImage4 from '../../icon/image 4.png';
import stickerImage5 from '../../icon/image 5.png';
import './DrawingEditor.css';

const PRESET_COLORS = [
  '#FFFFFF',
  '#FF6B6B',
  '#FFEE58',
  '#6EE7B7',
  '#67E8F9',
  '#818CF8'
];

const STICKER_IMAGES = [
  { src: stickerImage4, alt: 'sticker 1' },
  { src: stickerImage5, alt: 'sticker 2' }
];

export default function DrawingEditor({ onNavigateToArchive }) {
  // 기본 펜
  const [activeTool, setActiveTool] = useState('pen');
  const [lineWidth, setLineWidth] = useState(6);
  const [penColor, setPenColor] = useState('#000000');
  const [isRainbowSelected, setIsRainbowSelected] = useState(false);

  // 스티커 및 이미지 리스트
  const [placedElements, setPlacedElements] = useState([]);
  const [selectedElemIndex, setSelectedElemIndex] = useState(null); // 숫자 | 'drawing' | null

  // 드로잉 레이어 
  const [drawingBound, setDrawingBound] = useState(null);
  const [drawingZIndex, setDrawingZIndex] = useState(5);

  const nextZIndex = useRef(10);

  // 메시지 모달 
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDrawing = useRef(false);

  const dragInfo = useRef({
    mode: null,
    target: null,
    index: null,
    startX: 0,
    startY: 0,
    initialW: 0,
    initialH: 0,
    initialX: 0,
    initialY: 0
  });

  
  const updateDrawingBoundingBox = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    let hasPixel = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          hasPixel = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasPixel) {
      setDrawingBound(null);
      if (selectedElemIndex === 'drawing') setSelectedElemIndex(null);
      return;
    }

    minX = Math.max(0, minX - 4);
    minY = Math.max(0, minY - 4);
    maxX = Math.min(canvas.width, maxX + 4);
    maxY = Math.min(canvas.height, maxY + 4);

    setDrawingBound({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    });
  };

  const handleToolClick = (tool) => {
    if (activeTool === tool) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
      setSelectedElemIndex(null);
      if (tool === 'image' && fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleFrameClick = (e) => {
    if (e.target.id === 'drawingFrame') {
      setSelectedElemIndex(null);
    }
  };

  const startDrawing = (e) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
    }
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    updateDrawingBoundingBox();
  };

  const handleAddSticker = (sticker) => {
    if (placedElements.length >= 2) {
      alert('최대 2개까지만 배치할 수 있습니다.');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const currentZ = nextZIndex.current++;
      const newElem = {
        type: 'sticker',
        imgObj: img,
        alt: sticker.alt,
        x: 250,
        y: 250,
        width: 80,
        height: 80,
        zIndex: currentZ
      };
      setPlacedElements(prev => [...prev, newElem]);
      setSelectedElemIndex(placedElements.length);
    };
    img.src = sticker.src;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (placedElements.length >= 2) {
      alert('최대 2개까지만 배치할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const currentZ = nextZIndex.current++;
        const newElem = {
          type: 'image',
          imgObj: img,
          x: 200,
          y: 200,
          width: 140,
          height: 140,
          zIndex: currentZ
        };
        setPlacedElements(prev => [...prev, newElem]);
        setSelectedElemIndex(placedElements.length);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteElement = (index, e) => {
    e.stopPropagation();
    setPlacedElements(prev => prev.filter((_, i) => i !== index));
    setSelectedElemIndex(null);
  };

  const handleDeleteDrawing = (e) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDrawingBound(null);
    setSelectedElemIndex(null);
  };

  // 클릭 및 드래그 
  const startDragItem = (index, e) => {
    e.stopPropagation();
    const currentZ = nextZIndex.current++;
    setSelectedElemIndex(index);
    setPlacedElements(prev => prev.map((el, i) => (i === index ? { ...el, zIndex: currentZ } : el)));

    const elem = placedElements[index];
    dragInfo.current = {
      mode: 'move',
      target: 'elem',
      index,
      startX: e.clientX,
      startY: e.clientY,
      initialX: elem.x,
      initialY: elem.y
    };
  };

  const startResizeItem = (index, e) => {
    e.stopPropagation();
    const elem = placedElements[index];
    dragInfo.current = {
      mode: 'resize',
      target: 'elem',
      index,
      startX: e.clientX,
      startY: e.clientY,
      initialW: elem.width,
      initialH: elem.height
    };
  };

  const startDragDrawing = (e) => {
    if (activeTool === 'pen' || activeTool === 'eraser' || !drawingBound) return;
    e.stopPropagation();
    const currentZ = nextZIndex.current++;
    setSelectedElemIndex('drawing');
    setDrawingZIndex(currentZ);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    tempCanvas.getContext('2d').drawImage(canvasRef.current, 0, 0);

    dragInfo.current = {
      mode: 'move',
      target: 'drawing',
      startX: e.clientX,
      startY: e.clientY,
      initialX: drawingBound.x,
      initialY: drawingBound.y,
      initialW: drawingBound.width,
      initialH: drawingBound.height,
      snapshotCanvas: tempCanvas
    };
  };

  const startResizeDrawing = (e) => {
    e.stopPropagation();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    tempCanvas.getContext('2d').drawImage(canvasRef.current, 0, 0);

    dragInfo.current = {
      mode: 'resize',
      target: 'drawing',
      startX: e.clientX,
      startY: e.clientY,
      initialX: drawingBound.x,
      initialY: drawingBound.y,
      initialW: drawingBound.width,
      initialH: drawingBound.height,
      snapshotCanvas: tempCanvas
    };
  };

  const handleGlobalMouseMove = (e) => {
    if (!dragInfo.current.mode) return;
    const { mode, target, index, startX, startY, initialX, initialY, initialW, initialH, snapshotCanvas } = dragInfo.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (target === 'elem') {
      if (mode === 'move') {
        const nextX = Math.max(0, Math.min(700 - 40, initialX + dx));
        const nextY = Math.max(0, Math.min(630 - 40, initialY + dy));
        setPlacedElements(prev => prev.map((el, i) => (i === index ? { ...el, x: nextX, y: nextY } : el)));
      } else if (mode === 'resize') {
        const nextSize = Math.max(40, Math.min(350, initialW + Math.max(dx, dy)));
        setPlacedElements(prev => prev.map((el, i) => (i === index ? { ...el, width: nextSize, height: nextSize } : el)));
      }
    } else if (target === 'drawing' && snapshotCanvas) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mode === 'move') {
        const nextX = initialX + dx;
        const nextY = initialY + dy;
        ctx.drawImage(snapshotCanvas, dx, dy);
        setDrawingBound(prev => ({ ...prev, x: nextX, y: nextY }));
      } else if (mode === 'resize') {
        const scaleFactor = Math.max(0.2, (initialW + dx) / initialW);
        const nextW = initialW * scaleFactor;
        const nextH = initialH * scaleFactor;

        ctx.drawImage(
          snapshotCanvas,
          initialX, initialY, initialW, initialH,
          initialX, initialY, nextW, nextH
        );
        setDrawingBound(prev => ({ ...prev, width: nextW, height: nextH }));
      }
    }
  };

  const handleGlobalMouseUp = () => {
    if (dragInfo.current.target === 'drawing') {
      updateDrawingBoundingBox();
    }
    dragInfo.current.mode = null;
    dragInfo.current.snapshotCanvas = null;
  };

  const handleOpenShareModal = () => {
    setIsMessageModalOpen(true);
  };

  const handleFinalSubmit = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const canvas = canvasRef.current;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 700;
    exportCanvas.height = 630;
    const expCtx = exportCanvas.getContext('2d');

    // z-index 순서에 따라 정렬 합성
    const renderQueue = [
      ...placedElements.map(el => ({ ...el, isElem: true })),
      { isElem: false, zIndex: drawingZIndex }
    ].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const item of renderQueue) {
      if (item.isElem) {
        if (item.type === 'sticker') {
          expCtx.drawImage(item.imgObj, item.x, item.y, item.width, item.height);
        } else if (item.type === 'image') {
          expCtx.drawImage(item.imgObj, item.x, item.y, item.width, item.height);
        }
      } else {
        expCtx.drawImage(canvas, 0, 0);
      }
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const finalMsg = userMessage.trim() || '';

    try {
      const { error } = await supabase.from('artifacts').insert([
        {
          image_url: dataUrl,
          dominant_color: penColor === '#FFFFFF' ? '#67E8F9' : penColor,
          message: finalMsg
        }
      ]);
      if (error) throw error;
      setIsMessageModalOpen(false);
      onNavigateToArchive();
    } catch (err) {
      console.error('업로드 실패:', err);
      alert('업로드 실패');
    } finally {
      setIsUploading(false);
    }
  };

  const isDrawingMode = activeTool === 'pen' || activeTool === 'eraser';

  return (
    <div className="editor-screen" onMouseMove={handleGlobalMouseMove} onMouseUp={handleGlobalMouseUp}>


      <div className="content-container">
        <h1 className="title-heading">TITLE TXT</h1>

        <div className="main-stage">
          <div className="drawing-frame" id="drawingFrame" onMouseDown={handleFrameClick}>
            {/* 스티커 및 이미지 */}
            {placedElements.map((elem, idx) => {
              const isSelected = selectedElemIndex === idx;
              return (
                <div
                  key={idx}
                  className={`elem-wrapper ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: elem.x,
                    top: elem.y,
                    width: elem.width,
                    height: elem.height,
                    zIndex: elem.zIndex || 2
                  }}
                  onMouseDown={(e) => startDragItem(idx, e)}
                >
                  {elem.type === 'sticker' ? (
                    <img src={elem.imgObj.src} alt={elem.alt} className="sticker-content" />
                  ) : (
                    <img src={elem.imgObj.src} alt="uploaded" className="image-content" />
                  )}

                  {isSelected && (
                    <>
                      <button
                        type="button"
                        className="elem-delete-btn"
                        onMouseDown={(e) => handleDeleteElement(idx, e)}
                      >
                        ✕
                      </button>
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => startResizeItem(idx, e)}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* 드로잉 캔버스 */}
            <canvas
              ref={canvasRef}
              width={700}
              height={630}
              className={`canvas-layer ${isDrawingMode ? 'drawing-active' : ''}`}
              style={{ zIndex: isDrawingMode ? 999 : drawingZIndex }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />

            {/* 그려진 실제 크기 */}
            {drawingBound && !isDrawingMode && (
              <div
                className={`drawing-bounding-box ${selectedElemIndex === 'drawing' ? 'selected' : ''}`}
                style={{
                  left: drawingBound.x,
                  top: drawingBound.y,
                  width: drawingBound.width,
                  height: drawingBound.height,
                  zIndex: drawingZIndex + 1
                }}
                onMouseDown={startDragDrawing}
              >
                {selectedElemIndex === 'drawing' && (
                  <>
                    <button
                      type="button"
                      className="elem-delete-btn"
                      onMouseDown={handleDeleteDrawing}
                    >
                      ✕
                    </button>
                    <div
                      className="resize-handle"
                      onMouseDown={startResizeDrawing}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="tools-panel">
            <div className="tool-icons-row">
              <button
                className={`circle-icon-btn ${activeTool === 'pen' ? 'active' : ''}`}
                onClick={() => handleToolClick('pen')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>

              <button
                className={`circle-icon-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                onClick={() => handleToolClick('eraser')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                  <path d="M22 21H7" /><path d="m5 11 9 9" />
                </svg>
              </button>

              <button
                className={`circle-icon-btn ${activeTool === 'sticker' ? 'active' : ''}`}
                onClick={() => handleToolClick('sticker')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="m12 8 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5z" />
                </svg>
              </button>

              <button
                className={`circle-icon-btn ${activeTool === 'image' ? 'active' : ''}`}
                onClick={() => handleToolClick('image')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </div>

            {/* 스티커*/}
            {activeTool === 'sticker' && (
              <div className="sticker-list-grid">
                {STICKER_IMAGES.map((sticker, idx) => (
                  <button key={idx} className="emoji-btn" onClick={() => handleAddSticker(sticker)}>
                    <img src={sticker.src} alt={sticker.alt} className="sticker-option-img" />
                  </button>
                ))}
              </div>
            )}

            {/* 펜/지우개 */}
            {(activeTool === 'pen' || activeTool === 'eraser') && (
              <div className="settings-block">
                <div className="field-group">
                  <span className="field-title">Weight</span>
                  <div className="slider-track-wrap">
                    <input
                      type="range"
                      min="2"
                      max="32"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="custom-range"
                    />
                  </div>
                </div>

              
                {activeTool === 'pen' && (
                  <div className="field-group" style={{ marginTop: '50px' }}>
                    <span className="field-title">Color</span>
                    <div className="palette-flex">
                      {PRESET_COLORS.map((c, i) => (
                        <button
                          key={i}
                          className={`palette-dot ${penColor === c && !isRainbowSelected ? 'active-dot' : ''}`}
                          style={{ backgroundColor: c, border: c === '#FFFFFF' ? '1px solid #E5E7EB' : 'none' }}
                          onClick={() => {
                            setPenColor(c);
                            setIsRainbowSelected(false);
                          }}
                        />
                      ))}

                      <label className={`palette-dot rainbow-dot ${isRainbowSelected ? 'active-dot' : ''}`}>
                        <input
                          type="color"
                          value={penColor}
                          onInput={(e) => {
                            setPenColor(e.target.value);
                            setIsRainbowSelected(true);
                          }}
                          onChange={(e) => {
                            setPenColor(e.target.value);
                            setIsRainbowSelected(true);
                          }}
                          className="custom-color-overlay-input"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bottom-action-wrap">
              <button className="oval-btn share-btn" onClick={handleOpenShareModal}>Share</button>
              <button className="oval-btn archive-btn" onClick={onNavigateToArchive}>Archive</button>
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 모달 */}
      {isMessageModalOpen && (
        <div className="message-modal-overlay">
          <div className="message-modal-card">
            <h3 className="modal-headline">MESSAGE</h3>

            <textarea
              className="message-textarea"
              placeholder="message"
              maxLength={50}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
            />
            <div className="char-count">{userMessage.length} / 50자</div>
            <div className="modal-btn-row">
              <button className="cancel-modal-btn" onClick={() => setIsMessageModalOpen(false)}>cancle</button>
              <button className="confirm-modal-btn" onClick={handleFinalSubmit} disabled={isUploading}>
                {isUploading ? '...' : 'share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
