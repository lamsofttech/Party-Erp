import React, { useState } from 'react';
import { TextField, FormHelperText, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface InputProps {
    label: string;
    type?: string;
    placeholder?: string;
    error?: boolean;
    helperText?: string;
    icon?: React.ReactNode;
    onChange: (value: string) => void;
}

const Input: React.FC<InputProps> = ({ label, type = 'text', placeholder, error = false, helperText, icon, onChange }) => {
    const [visible, setVisible] = useState(false);

    const handleToggleVisibility = () => {
        setVisible(!visible);
    };

    return (
        <div>
            <TextField
                label={label}
                type={type === 'password' && !visible ? 'password' : 'text'}
                placeholder={placeholder}
                error={error}
                onChange={(e) => onChange(e.target.value)}
                InputProps={{
                    startAdornment: icon ? (
                        <InputAdornment position="start">
                            {icon}
                        </InputAdornment>
                    ) : null,
                    endAdornment: type === 'password' ? (
                        <InputAdornment position="end">
                            <IconButton
                                onClick={handleToggleVisibility}
                                edge="end"
                            >
                                {visible ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                        </InputAdornment>
                    ) : null,
                }}
                variant="outlined"
                fullWidth
            />
            {error && helperText && <FormHelperText error>{helperText}</FormHelperText>}
        </div>
    );
};

export default Input;