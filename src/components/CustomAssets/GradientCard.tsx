import { Box, styled } from '@mui/material';

export const GradientCard = styled(Box)<{ color: string; secondaryColor: string }>(({ theme, color, secondaryColor }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, ${color}, ${secondaryColor})`,
  }
}));