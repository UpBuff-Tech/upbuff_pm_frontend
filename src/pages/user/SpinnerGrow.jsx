// The row of six coloured "growing" dots shown while something is loading.

const COLOURS = ['', ' text-primary', ' text-secondary', ' text-success', ' text-danger', ' text-warning'];

export default function SpinnerGrow({ className = 'demo-inline-spacing', style = { textAlign: 'center' } }) {
  return (
    <div className={className} style={style}>
      {COLOURS.map((colour) => (
        <div key={colour} className={'spinner-grow' + colour} role="status">
          <span className="visually-hidden"></span>
        </div>
      ))}
    </div>
  );
}
