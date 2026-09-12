import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PhotoBoothPage.css';

export default function PhotoBoothPage() {
    const navigate = useNavigate();

    // 기본 
    const [step, setStep] = useState('HOME');
    const [timer, setTimer] = useState(5);
    const [photos, setPhotos] = useState([]);
    const [frameColor, setFrameColor] = useState('#FFFFFF');
    const [filter, setFilter] = useState('COLOR');

    // 카메라
    const [isFlashing, setIsFlashing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // 이미지
    const [transforms, setTransforms] = useState(Array(4).fill({ x: 0, y: 0 }));
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // DOM Refs
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);
    const [activeUploadSlot, setActiveUploadSlot] = useState(0);

    const resetTransforms = () => {
        setTransforms(Array(4).fill({ x: 0, y: 0 }));
    };

    const handleBack = () => {
        stopWebcam();
        if (step === 'HOME') navigate('/guestbook');
        else if (step === 'TAKE' || step === 'UPLOAD') setStep('HOME');
        else if (step === 'EDIT') setStep('HOME');
        else if (step === 'PRINT') setStep('EDIT');
        else if (step === 'SHARE') setStep('PRINT');
    };

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
        } catch {
            alert('카메라 접근 권한을 허용해주세요.');
            setStep('HOME');
        }
    };

    const stopWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setPhotos((prev) => [...prev, canvas.toDataURL('image/jpeg')]);
    };

    useEffect(() => {
        let countdown;

        if (step === 'TAKE') {
            if (!streamRef.current) startWebcam();

            if (photos.length >= 4) {
                countdown = setTimeout(() => {
                    stopWebcam();
                    setStep('EDIT');
                }, 500);
                return () => clearTimeout(countdown);
            }

            if (isPaused) return;

            if (timer > 0) {
                countdown = setTimeout(() => setTimer((prev) => prev - 1), 1000);
                return () => clearTimeout(countdown);
            } else {
                capturePhoto();

                setTimeout(() => {
                    setIsFlashing(true);
                    setIsPaused(true);
                }, 0);

                setTimeout(() => setIsFlashing(false), 150);

                setTimeout(() => {
                    setTimer(5);
                    setIsPaused(false);
                }, 1500);
            }
        }
    }, [step, timer, photos.length, isPaused]);

    const triggerUpload = (index) => {
        setActiveUploadSlot(index);
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const newPhotos = [...photos];
            while (newPhotos.length < 4) newPhotos.push(null);
            newPhotos[activeUploadSlot] = event.target.result;
            setPhotos(newPhotos);
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    const handlePointerDown = (e, i) => {
        if (!photos[i]) return;
        setDraggingIdx(i);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e, i) => {
        if (draggingIdx === i) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            const newClientX = e.clientX;
            const newClientY = e.clientY;

            setTransforms(prev => {
                const newT = [...prev];
                const target = e.target;

                const imgNatWidth = target.naturalWidth;
                const imgNatHeight = target.naturalHeight;

                if (!imgNatWidth || !imgNatHeight) return newT;

                const slotWidth = target.parentElement.clientWidth;
                const slotHeight = target.parentElement.clientHeight;

                const imgRatio = imgNatWidth / imgNatHeight;
                const slotRatio = slotWidth / slotHeight;

                let renderWidth = slotWidth;
                let renderHeight = slotHeight;

                if (imgRatio > slotRatio) {
                    renderWidth = slotHeight * imgRatio;
                } else {
                    renderHeight = slotWidth / imgRatio;
                }

                const maxX = Math.max(0, (renderWidth - slotWidth) / 2);
                const maxY = Math.max(0, (renderHeight - slotHeight) / 2);

                let newX = newT[i].x + dx;
                let newY = newT[i].y + dy;

                newX = Math.max(-maxX, Math.min(maxX, newX));
                newY = Math.max(-maxY, Math.min(maxY, newY));

                newT[i] = { x: newX, y: newY };
                return newT;
            });

            setDragStart({ x: newClientX, y: newClientY });
        }
    };

    const handlePointerUp = (e, i) => {
        if (draggingIdx === i) {
            setDraggingIdx(null);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const generateFinalImage = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const frameWidth = 600;
        const padding = 30;
        const imgWidth = frameWidth - (padding * 2);
        const imgHeight = imgWidth * (2 / 3);
        const gap = 20;
        const bottomMargin = 120;
        const frameHeight = padding + (imgHeight * 4) + (gap * 3) + bottomMargin;

        canvas.width = frameWidth;
        canvas.height = frameHeight;
        ctx.fillStyle = frameColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const loadImage = (url) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = url;
        });

        const domSlotWidth = 208;
        const scaleFactor = imgWidth / domSlotWidth;

        for (let i = 0; i < 4; i++) {
            if (!photos[i]) continue;
            const img = await loadImage(photos[i]);
            const y = padding + i * (imgHeight + gap);

            ctx.save();
            ctx.beginPath();
            ctx.rect(padding, y, imgWidth, imgHeight);
            ctx.clip();

            ctx.filter = filter === 'BW' ? 'grayscale(100%)' : 'none';

            const cx = padding + imgWidth / 2;
            const cy = y + imgHeight / 2;
            ctx.translate(cx + (transforms[i].x * scaleFactor), cy + (transforms[i].y * scaleFactor));

            const imgRatio = img.width / img.height;
            const targetRatio = imgWidth / imgHeight;
            let drawWidth = imgWidth;
            let drawHeight = imgHeight;

            if (imgRatio > targetRatio) drawWidth = imgHeight * imgRatio;
            else drawHeight = imgWidth / imgRatio;

            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
        }
        return canvas.toDataURL('image/png');
    };

    const handleDownload = async () => {
        const dataUrl = await generateFinalImage();
        const link = document.createElement('a');
        link.download = 'my_photobooth.png';
        link.href = dataUrl;
        link.click();
    };

    const isAllUploaded = photos.length === 4 && photos.every(p => p !== null);

    return (
        <div className="photobooth-container">
            <header className="photobooth-header">
                <button className="back-btn" onClick={handleBack}>← BACK</button>
            </header>

            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

            <main className="photobooth-main">
                {step === 'HOME' && (
                    <div className="pb-layout-split">
                        <div className="pb-left">
                            <div className="four-cut-frame">
                                {[0, 1, 2, 3].map(i => <div key={i} className="empty-slot"></div>)}
                            </div>
                        </div>
                        <div className="pb-right center-buttons">
                            <button className="pb-btn" onClick={() => { setStep('TAKE'); setPhotos([]); setTimer(5); resetTransforms(); setIsPaused(false); }}>Take Photo</button>
                            <button className="pb-btn" onClick={() => { setStep('UPLOAD'); setPhotos([null, null, null, null]); resetTransforms(); }}>Upload Photo</button>
                        </div>
                    </div>
                )}

                {step === 'TAKE' && (
                    <div className="pb-camera-view">
                        <div className="camera-frame">
                            <video ref={videoRef} autoPlay playsInline muted className="live-video" />
                            <div className={`flash-overlay ${isFlashing ? 'flashing' : ''}`}></div>
                            <div className="camera-overlay">
                                <span className="timer-text">{isPaused ? '' : timer}</span>
                                <p className="cut-counter">{photos.length} / 4</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* UPLOAD */}
                {step === 'UPLOAD' && (
                    isAllUploaded ? (
                        <div className="pb-layout-split">
                            <div className="pb-left">
                                <div className="four-cut-frame upload-mode">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className="upload-slot">
                                            <img
                                                src={photos[i]}
                                                alt={`upload-${i}`}
                                                className="draggable-img"
                                                style={{
                                                    transform: `translate(${transforms[i].x}px, ${transforms[i].y}px)`,
                                                    cursor: draggingIdx === i ? 'grabbing' : 'grab',
                                                    touchAction: 'none'
                                                }}
                                                onPointerDown={(e) => handlePointerDown(e, i)}
                                                onPointerMove={(e) => handlePointerMove(e, i)}
                                                onPointerUp={(e) => handlePointerUp(e, i)}
                                                onPointerLeave={(e) => handlePointerUp(e, i)}
                                                draggable={false}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pb-right">
                                <div></div>
                                <button className="pb-btn bottom-right-btn" onClick={() => setStep('EDIT')}>
                                    Continue
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="pb-upload-view">
                            <div className="four-cut-frame upload-mode">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="upload-slot">
                                        {photos[i] ? (
                                            <img
                                                src={photos[i]}
                                                alt={`upload-${i}`}
                                                className="draggable-img"
                                                style={{
                                                    transform: `translate(${transforms[i].x}px, ${transforms[i].y}px)`,
                                                    cursor: draggingIdx === i ? 'grabbing' : 'grab',
                                                    touchAction: 'none'
                                                }}
                                                onPointerDown={(e) => handlePointerDown(e, i)}
                                                onPointerMove={(e) => handlePointerMove(e, i)}
                                                onPointerUp={(e) => handlePointerUp(e, i)}
                                                onPointerLeave={(e) => handlePointerUp(e, i)}
                                                draggable={false}
                                            />
                                        ) : (
                                            <div className="upload-placeholder" onClick={() => triggerUpload(i)}>+</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {['EDIT', 'PRINT', 'SHARE'].includes(step) && (
                    <div className="pb-layout-split">
                        <div className="pb-left">
                            <div className="four-cut-frame filled-frame" style={{ backgroundColor: frameColor }}>
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={`filled-slot ${filter === 'BW' ? 'bw-filter' : ''}`}>
                                        {photos[i] && (
                                            <img
                                                src={photos[i]}
                                                alt={`cut-${i}`}
                                                style={{ transform: `translate(${transforms[i].x}px, ${transforms[i].y}px)` }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pb-right">
                            {step === 'EDIT' && (
                                <div className="edit-options">
                                    <div>
                                        <div className="option-section">
                                            <h4>Color</h4>
                                            <div className="color-palette">
                                                {['#FFFFFF', '#111111', '#E5A5A5', '#A5BBE5', '#A5E5B9'].map(c => (
                                                    <div
                                                        key={c}
                                                        className="color-circle"
                                                        style={{ backgroundColor: c, border: c === '#FFFFFF' ? '1px solid #ccc' : 'none' }}
                                                        onClick={() => setFrameColor(c)}
                                                    />
                                                ))}


                                                <label className="color-circle rainbow-circle" title="직접 색상 선택">
                                                    <input
                                                        type="color"
                                                        value={frameColor}
                                                        onInput={(e) => setFrameColor(e.target.value)}
                                                        onChange={(e) => setFrameColor(e.target.value)}
                                                        className="safari-compatible-color-input"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="option-section">
                                            <h4>Filter</h4>
                                            <div className="color-palette">
                                                <div className="color-circle filter-color" onClick={() => setFilter('COLOR')}>C</div>
                                                <div className="color-circle filter-bw" onClick={() => setFilter('BW')}>B</div>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="pb-btn bottom-right-btn" onClick={() => setStep('PRINT')}>PRINT</button>
                                </div>
                            )}

                            {step === 'PRINT' && (
                                <div className="print-actions-wrapper">
                                    <div className="print-actions">
                                        <button className="pb-btn" onClick={handleDownload}>Download</button>
                                        <button className="pb-btn" onClick={() => setStep('SHARE')}>Share</button>
                                    </div>
                                </div>
                            )}

                            {step === 'SHARE' && (
                                <div className="share-form">
                                    <div>
                                        <h3>Write a message for the guestbook.</h3>
                                        <input type="text" placeholder="write your message" className="guestbook-input" />
                                    </div>
                                    <button className="pb-btn bottom-right-btn" onClick={() => navigate('/guestbook')}>Share</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}