import logo from '../assets/logo.png'

const ABSLogo = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-10',
    md: 'h-14',
    lg: 'h-24',
  }

  return (
    <img
      src={logo}
      alt="ABS Technologies"
      className={`${sizes[size]} w-auto object-contain`}
    />
  )
}

export default ABSLogo
