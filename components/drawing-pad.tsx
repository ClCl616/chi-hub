'use client';
import { useEffect, useRef } from 'react';
export function DrawingPad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const image = new Image();
    image.onload = () =>
      canvas
        .getContext('2d')
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = canvasRef.current?.getContext('2d');
    const p = point(event);
    context?.beginPath();
    context?.moveTo(p.x, p.y);
  };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d')!;
    const p = point(event);
    context.lineTo(p.x, p.y);
    context.strokeStyle = '#171916';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current?.toDataURL('image/png') ?? '');
  };
  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas)
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };
  return (
    <div className="drawing-pad">
      <div>
        <span>펜 또는 마우스로 필기하세요.</span>
        <button type="button" onClick={clear}>
          지우기
        </button>
      </div>
      <canvas
        aria-label="필기 캔버스"
        ref={canvasRef}
        width="1200"
        height="700"
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </div>
  );
}
