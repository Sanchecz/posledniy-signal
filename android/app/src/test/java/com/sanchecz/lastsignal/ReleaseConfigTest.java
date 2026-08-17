package com.sanchecz.lastsignal;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ReleaseConfigTest {

    @Test
    public void releaseIdentityIsStable() {
        assertEquals("com.sanchecz.lastsignal", BuildConfig.APPLICATION_ID);
        assertEquals("1.1.0", BuildConfig.VERSION_NAME);
        assertTrue(BuildConfig.VERSION_CODE > 0);
    }
}
